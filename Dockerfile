# 构建阶段
FROM node:18-alpine AS builder

# 安装 pnpm
RUN npm install -g pnpm

WORKDIR /app

# 复制子目录的依赖文件
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# 安装依赖（允许更新 lockfile）
RUN cd backend && pnpm install --no-frozen-lockfile
RUN cd frontend && pnpm install --no-frozen-lockfile

# 复制源代码
COPY backend/src ./backend/src
COPY backend/server.js ./backend/server.js
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public

# 构建前端
RUN cd frontend && pnpm run build

# 生产阶段
FROM node:18-alpine AS production

# 安装 PM2（移除了所有绘图相关的运行时依赖）
RUN npm install -g pm2

WORKDIR /app

# 复制后端依赖文件
COPY backend/package*.json ./backend/

# 安装 pnpm 和生产依赖
RUN npm install -g pnpm
RUN cd backend && pnpm install --no-frozen-lockfile --prod

# 复制后端源代码
COPY backend/src ./backend/src
COPY backend/server.js ./backend/server.js

# 复制前端构建产物
COPY --from=builder /app/frontend/build ./frontend/build

# 复制 PM2 配置
COPY ecosystem.config.js ./

# 清理缓存
RUN pnpm store prune && npm cache clean --force

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
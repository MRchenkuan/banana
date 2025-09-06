# 构建阶段
FROM node:18-alpine as builder
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN pnpm install --no-frozen-lockfile

# 复制源代码
COPY . .

# 构建应用（禁用 ESLint）
RUN DISABLE_ESLINT_PLUGIN=true pnpm run build

# 生产阶段
FROM nginx:alpine

# 复制构建结果
COPY --from=builder /app/build /usr/share/nginx/html

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
# 构建阶段
FROM --platform=${PLATFORM:-linux/amd64} node:18-alpine as builder
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
FROM --platform=${PLATFORM:-linux/amd64} nginx:alpine as production
WORKDIR /usr/share/nginx/html

# 复制构建结果
COPY --from=builder /app/build .

# 配置 nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
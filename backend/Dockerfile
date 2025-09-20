FROM node:18-alpine as builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 只复制依赖相关文件
COPY package*.json pnpm-lock.yaml ./

# 安装依赖，使用 --prod 只安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 复制源代码
COPY . .

FROM node:18-alpine as production

WORKDIR /app

# 安装 pnpm 和 pm2
RUN npm install -g pnpm pm2

# 从构建阶段复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/src ./src
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/.env ./.env
COPY --from=builder /app/alipayPublicKey_RSA2.txt ./alipayPublicKey_RSA2.txt

# 创建 PM2 配置文件
RUN echo '{\
  "apps": [{\
    "name": "banana-backend",\
    "script": "server.js",\
    "instances": "max",\
    "exec_mode": "cluster",\
    "autorestart": true,\
    "max_memory_restart": "1G",\
    "watch": false,\
    "env_production": {\
      "NODE_ENV": "production"\
    },\
    "merge_logs": true,\
    "log_date_format": "YYYY-MM-DD HH:mm:ss"\
  }]\
}' > ecosystem.config.json

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3001

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# 使用 PM2 启动应用
CMD ["pm2-runtime", "ecosystem.config.json"]
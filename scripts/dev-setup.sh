#!/bin/bash

# 开发环境一键启动脚本
set -e

echo "🚀 启动开发环境..."

# 启动 MySQL
echo "1️⃣ 启动 MySQL 容器..."
./scripts/mysql-start.sh

# 等待 MySQL 完全启动
echo "2️⃣ 等待 MySQL 完全启动..."
sleep 15

# 初始化数据库
echo "3️⃣ 初始化数据库..."
node scripts/initDatabase.js

# 检查数据库
echo "4️⃣ 检查数据库状态..."
node scripts/checkDatabase.js

echo "✅ 开发环境启动完成！"
echo "🎯 现在可以运行 'npm run dev' 启动后端服务"
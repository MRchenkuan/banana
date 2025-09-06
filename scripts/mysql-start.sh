#!/bin/bash

# MySQL Docker 容器启动脚本
set -e

CONTAINER_NAME="banana-mysql"
MYSQL_ROOT_PASSWORD="123456"
MYSQL_DATABASE="banana_chat"
MYSQL_USER="banana_user"
MYSQL_PASSWORD="banana_pass"
MYSQL_PORT="3306"
VOLUME_NAME="banana_mysql_data"

echo "🚀 启动 MySQL 容器..."

# 检查容器是否已存在
if [ $(docker ps -aq -f name=$CONTAINER_NAME) ]; then
    if [ $(docker ps -q -f name=$CONTAINER_NAME) ]; then
        echo "✅ MySQL 容器已在运行"
    else
        echo "📦 启动已存在的 MySQL 容器..."
        docker start $CONTAINER_NAME
        echo "⏳ 等待 MySQL 启动..."
        sleep 15
    fi
else
    echo "🆕 创建新的 MySQL 容器..."
    docker run --name $CONTAINER_NAME \
      -e MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD \
      -e MYSQL_DATABASE=$MYSQL_DATABASE \
      -e MYSQL_USER=$MYSQL_USER \
      -e MYSQL_PASSWORD=$MYSQL_PASSWORD \
      -p $MYSQL_PORT:3306 \
      -v $VOLUME_NAME:/var/lib/mysql \
      -d mysql:8.0 \
      --default-authentication-plugin=mysql_native_password
      echo "⏳ 等待 MySQL 启动..."
      sleep 15
fi



# 确保数据库和权限配置正确
echo "🔧 配置数据库和权限..."
docker exec $CONTAINER_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "
CREATE DATABASE IF NOT EXISTS $MYSQL_DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';
ALTER USER '$MYSQL_USER'@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON $MYSQL_DATABASE.* TO '$MYSQL_USER'@'%';
GRANT SELECT ON *.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
" 2>/dev/null || echo "数据库配置可能已存在"

# 验证配置
echo "🔍 验证数据库配置..."
docker exec $CONTAINER_NAME mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SHOW DATABASES;" | grep $MYSQL_DATABASE && echo "✅ 数据库 $MYSQL_DATABASE 存在" || echo "❌ 数据库 $MYSQL_DATABASE 不存在"

# 检查容器状态
if [ $(docker ps -q -f name=$CONTAINER_NAME) ]; then
    echo "✅ MySQL 容器启动成功！"
    echo "📊 容器状态："
    docker ps | grep $CONTAINER_NAME
    echo ""
    echo "🔗 连接信息："
    echo "  主机: localhost"
    echo "  端口: $MYSQL_PORT"
    echo "  数据库: $MYSQL_DATABASE"
    echo "  用户: $MYSQL_USER"
    echo "  密码: $MYSQL_PASSWORD"
    echo "  Root密码: $MYSQL_ROOT_PASSWORD"
else
    echo "❌ MySQL 容器启动失败！"
    exit 1
fi
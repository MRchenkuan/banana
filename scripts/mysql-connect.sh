#!/bin/bash

# MySQL 连接脚本
set -e

CONTAINER_NAME="banana-mysql"
MYSQL_USER="banana_user"
MYSQL_PASSWORD="banana_pass"
MYSQL_DATABASE="banana_chat"

echo "🔗 连接到 MySQL 数据库..."

# 检查容器是否运行
if [ ! $(docker ps -q -f name=$CONTAINER_NAME) ]; then
    echo "❌ MySQL 容器未运行，请先启动容器"
    echo "运行: npm run mysql:start"
    exit 1
fi

# 连接到数据库
echo "连接信息："
echo "  数据库: $MYSQL_DATABASE"
echo "  用户: $MYSQL_USER"
echo ""
echo "提示：输入密码 '$MYSQL_PASSWORD'"

docker exec -it $CONTAINER_NAME mysql -u $MYSQL_USER -p $MYSQL_DATABASE
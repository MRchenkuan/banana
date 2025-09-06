#!/bin/bash

# MySQL Docker 容器重置脚本（删除容器和数据）
set -e

CONTAINER_NAME="banana-mysql"
VOLUME_NAME="banana_mysql_data"

echo "⚠️  警告：此操作将删除所有 MySQL 数据！"
read -p "确认继续？(y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  删除 MySQL 容器和数据..."
    
    # 停止并删除容器
    if [ $(docker ps -aq -f name=$CONTAINER_NAME) ]; then
        docker stop $CONTAINER_NAME 2>/dev/null || true
        docker rm $CONTAINER_NAME
        echo "✅ 容器已删除"
    fi
    
    # 删除数据卷
    if [ $(docker volume ls -q -f name=$VOLUME_NAME) ]; then
        docker volume rm $VOLUME_NAME
        echo "✅ 数据卷已删除"
    fi
    
    echo "🎉 MySQL 重置完成！"
else
    echo "❌ 操作已取消"
fi
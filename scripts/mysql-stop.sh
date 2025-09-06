#!/bin/bash

# MySQL Docker 容器停止脚本
set -e

CONTAINER_NAME="banana-mysql"

echo "🛑 停止 MySQL 容器..."

if [ $(docker ps -q -f name=$CONTAINER_NAME) ]; then
    docker stop $CONTAINER_NAME
    echo "✅ MySQL 容器已停止"
else
    echo "ℹ️  MySQL 容器未在运行"
fi
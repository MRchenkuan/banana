#!/bin/bash

# MySQL 日志查看脚本
set -e

CONTAINER_NAME="banana-mysql"

echo "📋 查看 MySQL 容器日志..."

if [ $(docker ps -aq -f name=$CONTAINER_NAME) ]; then
    docker logs -f $CONTAINER_NAME
else
    echo "❌ MySQL 容器不存在"
    exit 1
fi
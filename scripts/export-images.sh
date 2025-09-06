#!/bin/bash

echo "🚀 开始导出 Docker 镜像..."

# 构建镜像
echo "📦 构建镜像..."
docker compose build

# 直接使用构建后的镜像名称
# Docker Compose 会自动为构建的镜像命名为 项目名_服务名
PROJECT_NAME=$(basename "$(pwd)")
BACKEND_IMAGE="${PROJECT_NAME}-backend:latest"
FRONTEND_IMAGE="${PROJECT_NAME}-frontend:latest"

# 验证镜像是否存在
echo "🔍 验证镜像..."
if ! docker image inspect "$BACKEND_IMAGE" >/dev/null 2>&1; then
    echo "❌ Backend 镜像不存在: $BACKEND_IMAGE"
    echo "📋 可用的镜像:"
    docker images | grep backend
    exit 1
fi

if ! docker image inspect "$FRONTEND_IMAGE" >/dev/null 2>&1; then
    echo "❌ Frontend 镜像不存在: $FRONTEND_IMAGE"
    echo "📋 可用的镜像:"
    docker images | grep frontend
    exit 1
fi

echo "✅ 镜像验证通过"
echo "📤 导出镜像..."
echo "   Backend: $BACKEND_IMAGE"
echo "   Frontend: $FRONTEND_IMAGE"

# 导出应用镜像到一个文件（不包含 MySQL）
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILENAME="banana-apps-${TIMESTAMP}.tar"

docker save -o "$FILENAME" \
  "$BACKEND_IMAGE" \
  "$FRONTEND_IMAGE"

if [ $? -eq 0 ]; then
    echo "✅ 镜像导出完成！"
    echo "📁 文件位置: $(pwd)/$FILENAME"
    echo "📊 文件大小: $(ls -lh "$FILENAME" | awk '{print $5}')"
    echo ""
    echo "🚀 部署说明："
    echo "1. 上传 $FILENAME 到云服务器"
    echo "2. 在云端: docker load -i $FILENAME"
    echo "3. 在云端安装 MySQL 或使用 Docker 运行 MySQL"
    echo "4. 修改 docker-compose.prod.yml 配置"
    echo "5. 启动服务: docker compose -f docker-compose.prod.yml up -d"
else
    echo "❌ 镜像导出失败！"
    exit 1
fi
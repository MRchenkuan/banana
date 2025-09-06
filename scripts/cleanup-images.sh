#!/bin/bash

echo "🧹 开始清理 Docker 镜像..."

# 显示清理前的镜像统计
echo "📊 清理前镜像统计："
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
echo "总镜像数量: $(docker images -q | wc -l)"
echo "总占用空间: $(docker system df | grep Images | awk '{print $3}')"
echo ""

# 1. 清理悬空镜像
echo "🗑️  清理悬空镜像..."
docker image prune -f

# 2. 清理未使用的镜像（谨慎使用）
read -p "是否清理所有未使用的镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  清理未使用镜像..."
    docker image prune -a -f
fi

# 3. 清理旧版本的项目镜像
echo "🔍 查找项目旧镜像..."
OLD_BANANA_IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "banana|backend|frontend" | grep -v latest)
if [ ! -z "$OLD_BANANA_IMAGES" ]; then
    echo "发现以下旧版本镜像："
    echo "$OLD_BANANA_IMAGES"
    read -p "是否删除这些旧版本镜像？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "$OLD_BANANA_IMAGES" | xargs docker rmi
    fi
fi

# 4. 显示清理后的统计
echo ""
echo "✅ 清理完成！"
echo "📊 清理后镜像统计："
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | head -10
echo "总镜像数量: $(docker images -q | wc -l)"
echo "总占用空间: $(docker system df | grep Images | awk '{print $3}')"

# 5. 显示系统空间使用情况
echo ""
echo "💾 Docker 系统空间使用情况："
docker system df
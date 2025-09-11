#!/bin/bash

# Banana AI 应用启动脚本
# 作者: Banana Team
# 版本: 1.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
IMAGE_TAR="banana-apps-20250904-173630.tar"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
PROJECT_NAME="banana-ai"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    log_info "检查 Docker 环境..."
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查 Docker 服务是否运行
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请启动 Docker 服务"
        exit 1
    fi
    
    log_success "Docker 环境检查通过"
}

# 检查必要文件
check_files() {
    log_info "检查必要文件..."
    
    if [ ! -f "$IMAGE_TAR" ]; then
        log_error "镜像文件 $IMAGE_TAR 不存在"
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Docker Compose 文件 $COMPOSE_FILE 不存在"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "环境变量文件 $ENV_FILE 不存在，将使用默认配置"
        create_env_template
    fi
    
    log_success "文件检查完成"
}

# 创建环境变量模板
create_env_template() {
    log_info "创建环境变量模板文件..."
    cat > "$ENV_FILE" << EOF
# JWT 配置
JWT_SECRET=your-production-jwt-secret-key-$(date +%s)

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key

# 微信配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_MCH_ID=your-merchant-id
WECHAT_API_KEY=your-wechat-api-key
WECHAT_APP_SECRET=your-wechat-app-secret

# 生产环境 URL（请替换为你的域名）
WECHAT_NOTIFY_URL=https://yourdomain.com/api/payment/notify
REACT_APP_API_URL=https://yourdomain.com:3001
EOF
    log_warning "请编辑 $ENV_FILE 文件，配置正确的环境变量"
}

# 导入 Docker 镜像
load_images() {
    log_info "导入 Docker 镜像..."
    
    # 检查镜像是否已存在
    if docker images | grep -q "banana-backend" && docker images | grep -q "banana-frontend"; then
        log_warning "镜像已存在，跳过导入"
        return
    fi
    
    log_info "正在导入镜像文件 $IMAGE_TAR，请稍候..."
    if docker load -i "$IMAGE_TAR"; then
        log_success "镜像导入成功"
    else
        log_error "镜像导入失败"
        exit 1
    fi
}

# 停止现有服务
stop_services() {
    log_info "停止现有服务..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down --remove-orphans 2>/dev/null || true
    log_success "现有服务已停止"
}

# 启动服务
start_services() {
    log_info "启动 Banana AI 服务..."
    
    if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        exit 1
    fi
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待 MySQL 健康检查通过
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps | grep -q "healthy"; then
            log_success "MySQL 服务就绪"
            break
        fi
        
        log_info "等待 MySQL 启动... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "MySQL 启动超时"
        show_logs
        exit 1
    fi
    
    # 等待后端服务
    sleep 10
    log_success "所有服务已就绪"
}

# 显示服务状态
show_status() {
    log_info "服务状态:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps
    
    echo
    log_info "访问地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端 API: http://localhost:3001"
    echo "  MySQL: localhost:3306"
}

# 显示日志
show_logs() {
    log_info "最近的服务日志:"
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs --tail=20
}

# 清理函数
cleanup() {
    log_info "清理资源..."
    docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down 2>/dev/null || true
}

# 主函数
main() {
    echo "======================================"
    echo "    🍌 Banana AI 应用启动脚本"
    echo "======================================"
    echo
    
    # 设置清理陷阱
    trap cleanup EXIT
    
    # 执行启动流程
    check_docker
    check_files
    load_images
    stop_services
    start_services
    wait_for_services
    show_status
    
    echo
    log_success "🎉 Banana AI 应用启动完成！"
    echo
    log_info "常用命令:"
    echo "  查看日志: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f"
    echo "  停止服务: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME down"
    echo "  重启服务: docker-compose -f $COMPOSE_FILE -p $PROJECT_NAME restart"
    echo
}

# 处理命令行参数
case "${1:-start}" in
    start)
        main
        ;;
    stop)
        log_info "停止 Banana AI 服务..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
        log_success "服务已停止"
        ;;
    restart)
        log_info "重启 Banana AI 服务..."
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart
        log_success "服务已重启"
        ;;
    status)
        show_status
        ;;
    logs)
        docker-compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs}"
        echo "  start   - 启动服务（默认）"
        echo "  stop    - 停止服务"
        echo "  restart - 重启服务"
        echo "  status  - 查看状态"
        echo "  logs    - 查看日志"
        exit 1
        ;;
esac
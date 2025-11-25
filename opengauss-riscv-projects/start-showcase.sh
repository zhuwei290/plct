#!/bin/bash

# openGauss RISC-V 应用展示中心启动脚本
# 用于在腾讯云服务器上快速部署展示网站和网关

set -e

echo "🚀 启动 openGauss RISC-V 应用展示中心..."
echo "=========================================="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

# 检查配置文件
if [ ! -f "nginx-gateway/nginx.conf" ]; then
    echo "❌ 未找到 nginx-gateway/nginx.conf 配置文件"
    exit 1
fi

# 提示用户配置nginx
echo "⚠️  请确保已正确配置 nginx-gateway/nginx.conf"
echo "   - 如果SG2042有公网IP，修改upstream中的IP地址"
echo "   - 如果使用内网穿透，确保指向 127.0.0.1:8001 和 127.0.0.1:8002"
echo ""
read -p "按 Enter 继续，或 Ctrl+C 取消..."

# 停止旧容器
echo "🧹 清理旧容器..."
docker-compose -f docker-compose.showcase.yml down --remove-orphans 2>/dev/null || true

# 构建并启动服务
echo "🐳 构建并启动服务..."
docker-compose -f docker-compose.showcase.yml up -d --build

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose -f docker-compose.showcase.yml ps

# 测试访问
echo ""
echo "🧪 测试访问..."
if curl -s http://localhost/health > /dev/null; then
    echo "✅ 展示网站启动成功！"
    echo ""
    echo "📱 访问地址:"
    echo "   - 展示网站: http://$(curl -s ifconfig.me)"
    echo "   - 留言板: http://$(curl -s ifconfig.me)/messageboard"
    echo "   - 诊疗系统: http://$(curl -s ifconfig.me)/petclinic"
    echo ""
    echo "💡 管理命令:"
    echo "   查看日志: docker-compose -f docker-compose.showcase.yml logs -f"
    echo "   停止服务: docker-compose -f docker-compose.showcase.yml down"
    echo "   重启服务: docker-compose -f docker-compose.showcase.yml restart"
else
    echo "❌ 服务启动失败，请检查日志:"
    echo "   docker-compose -f docker-compose.showcase.yml logs"
fi


#!/bin/bash

# openGauss RISC-V 社区留言板启动脚本
# Slogan: 轻量级，高性能，开源芯

set -e

echo "🚀 启动 openGauss RISC-V 社区留言板..."
echo "Slogan: 轻量级，高性能，开源芯"
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

# 停止并清理旧容器
echo "🧹 清理旧容器..."
docker-compose down --remove-orphans 2>/dev/null || true

# 启动服务
echo "🐳 启动 Docker 服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 测试 API
echo "🧪 测试 API..."
if curl -s http://localhost/api/messages > /dev/null; then
    echo "✅ API 测试成功"
    echo ""
    echo "🎉 留言板启动成功！"
    echo "📱 访问地址: http://localhost"
    echo "📚 API 文档: http://localhost/api/docs"
    echo "💡 健康检查: http://localhost/health"
    echo ""
echo "💬 示例留言:"
curl -s http://localhost/api/messages | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f'✅ 成功获取 {len(data)} 条留言')
    for i, msg in enumerate(data[:3]):
        username = msg.get('username', '未知')
        content = msg.get('content', '')
        if isinstance(content, str):
            content_preview = content[:50]
        else:
            content_preview = str(content)[:50]
        print(f'  • {username}: {content_preview}...')
except Exception as e:
    print(f'❌ 错误: {e}')
"
else
    echo "❌ API 测试失败，请检查日志:"
    echo "docker-compose logs backend"
fi

echo ""
echo "🛠️  管理命令:"
echo "  停止服务: docker-compose down"
echo "  查看日志: docker-compose logs"
echo "  重启服务: docker-compose restart"
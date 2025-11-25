#!/bin/bash
# Java Shop 在线商城启动脚本

set -e

cd "$(dirname "$0")"

echo "🛍️  启动 Java Shop 在线商城..."
echo "================================"

# 1. 创建 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "⚠️  请检查并修改 .env 中的配置"
fi

# 2. 停止旧容器
echo "🛑 停止旧容器..."
docker-compose down

# 3. 清理旧镜像（可选）
read -p "是否清理旧镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理旧镜像..."
    docker-compose down --rmi local
fi

# 4. 启动数据库
echo "🗄️  启动数据库..."
docker-compose up -d database

# 5. 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 15

# 6. 初始化数据库
echo "📋 初始化数据库..."
docker-compose up databaseinit

# 7. 启动所有服务
echo "🚀 启动所有服务..."
docker-compose up -d

# 8. 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 9. 显示状态
echo ""
echo "================================"
echo "✅ Java Shop 启动完成！"
echo ""
echo "📍 访问地址："
echo "  - 前端: http://localhost:8010"
echo "  - 后端: http://localhost:8009"
echo "  - 数据库: localhost:5435"
echo ""
echo "📋 查看日志："
echo "  docker-compose logs -f"
echo ""
echo "🛑 停止服务："
echo "  docker-compose down"
echo ""
echo "================================"

docker-compose ps

#!/bin/bash
# Go Library 图书管理系统启动脚本

set -e

echo "🚀 启动 Go Library 图书管理系统"
echo "================================"

cd "$(dirname "$0")"

# 1. 检查并创建 .env 文件
if [ ! -f .env ]; then
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建，请检查配置"
fi

# 2. 生成前端文件
echo "🎨 生成前端文件..."
chmod +x setup-frontend.sh
./setup-frontend.sh

# 3. 停止旧容器
echo "🛑 停止旧容器..."
docker-compose down 2>/dev/null || true

# 4. 启动数据库
echo "🗄️  启动数据库..."
docker-compose up -d database

# 5. 等待数据库就绪
echo "⏳ 等待数据库就绪..."
sleep 15

# 6. 初始化数据库
echo "📦 初始化数据库..."
docker-compose up databaseinit

# 7. 启动所有服务
echo "🚀 启动所有服务..."
docker-compose up -d

echo ""
echo "================================"
echo "✅ 启动完成！"
echo ""
echo "📍 访问地址："
echo "  - 前端: http://localhost:8008"
echo "  - 后端: http://localhost:8007"
echo "  - 健康检查: http://localhost:8007/health"
echo ""
echo "📋 查看日志："
echo "  docker-compose logs -f"
echo ""
echo "================================"

# 显示服务状态
sleep 3
docker-compose ps

#!/bin/bash
# Go Todo App 启动脚本 - 自动配置 MD5 认证

set -e

cd "$(dirname "$0")"

echo "🚀 启动 Go Todo App..."
echo ""

# 停止并删除旧容器和数据卷
echo "1️⃣ 清理旧数据..."
docker-compose down -v
echo "✅ 清理完成"
echo ""

# 启动数据库容器
echo "2️⃣ 启动数据库容器..."
docker-compose up -d database
echo "✅ 数据库容器已启动"
echo ""

# 等待数据库就绪
echo "3️⃣ 等待数据库就绪..."
sleep 15
until docker exec og-todo-db bash -c "su - omm -c 'gsql -d postgres -c \"SELECT 1\"'" >/dev/null 2>&1; do
    echo "   数据库尚未就绪，继续等待..."
    sleep 5
done
echo "✅ 数据库已就绪"
echo ""

# 在数据库容器内设置 MD5 认证
echo "4️⃣ 配置 MD5 认证方式..."
docker exec og-todo-db bash -c "su - omm -c 'gsql -d postgres <<SQL
ALTER SYSTEM SET password_encryption_type = 0;
SELECT pg_reload_conf();
SHOW password_encryption_type;
SQL
'"
echo "✅ MD5 认证已配置"
echo ""

# 启动其他所有服务
echo "5️⃣ 启动应用服务..."
docker-compose up -d
echo "✅ 所有服务已启动"
echo ""

# 查看服务状态
echo "6️⃣ 服务状态:"
docker-compose ps
echo ""

# 查看初始化日志
echo "7️⃣ 数据库初始化日志:"
sleep 5
docker logs og-todo-init
echo ""

# 查看后端日志
echo "8️⃣ 后端服务日志:"
docker logs og-todo-backend
echo ""

echo "🎉 Go Todo App 启动完成!"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:8006"
echo "   后端 API: http://localhost:8005"
echo "   健康检查: http://localhost:8005/health"
echo ""
echo "📝 查看日志:"
echo "   docker-compose logs -f"

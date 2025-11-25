#!/bin/bash

cd "$(dirname "$0")"

# 设置密码环境变量
export PGPASSWORD=$DB_PASS

echo "开始初始化 openGauss 数据库..."

# 等待数据库完全启动
echo "⏳ 等待数据库就绪..."
sleep 10

# 尝试修复认证问题（如果需要）
echo "🔧 检查并修复认证配置..."
gsql -h $DB_HOST -U omm -d postgres -c "ALTER SYSTEM SET password_encryption_type = 0;" 2>/dev/null || true
gsql -h $DB_HOST -U omm -d postgres -c "SELECT pg_reload_conf();" 2>/dev/null || true

# 创建数据库
echo "📦 创建数据库 $DB_NAME..."
if gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USER -d postgres <<EOF
CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8' DBCOMPATIBILITY 'PG';
EOF
then
  echo "✅ 数据库创建成功"
  
  # 执行数据库结构初始化
  echo "📋 执行数据库结构初始化..."
  gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USER -d $DB_NAME <schema.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ 数据库结构初始化成功"
  else
    echo "❌ 数据库结构初始化失败"
    exit 1
  fi
else
  echo "⚠️  数据库可能已存在，尝试初始化..."
  # 即使数据库已存在，也尝试执行初始化（使用IF NOT EXISTS保护）
  gsql -h $DB_HOST -U $DB_USER -d $DB_NAME <schema.sql 2>/dev/null && echo "✅ 数据库结构初始化成功" || echo "⚠️  数据库结构可能已存在"
fi

echo "✅ 数据库初始化完成！"
echo "保持容器运行..."

# 保持容器运行
exec tail -f /dev/null


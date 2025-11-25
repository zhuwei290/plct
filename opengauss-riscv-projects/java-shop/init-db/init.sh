#!/bin/bash
set -e

cd "$(dirname "$0")"

# ==========================================
# 配置
# ==========================================
DB_HOST="${DB_HOST:-database}"
DB_USERNAME="${DB_USERNAME:-shopuser}"
DB_PASSWORD="${DB_PASSWORD:-ShopPass2024}"
DB_NAME="${DB_NAME:-shopdb}"

# ==========================================
# 等待数据库就绪
# ==========================================
echo "⏳ 等待数据库就绪..."
sleep 10

# ==========================================
# 创建数据库（如果不存在）
# ==========================================
echo "📋 创建数据库 $DB_NAME..."
if gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d postgres <<EOF
CREATE DATABASE $DB_NAME OWNER $DB_USERNAME ENCODING 'UTF8' DBCOMPATIBILITY 'PG';
EOF
then
    echo "✅ 数据库 $DB_NAME 创建成功"
else
    echo "⚠️  数据库 $DB_NAME 可能已存在，继续执行..."
fi

# ==========================================
# 应用数据库结构（建表）
# ==========================================
echo "📋 执行数据库结构初始化..."
if gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d $DB_NAME -f /init-db/schema.sql
then
    echo "✅ 数据库结构初始化成功"
    echo "🎉 初始化完成，容器即将退出"
else
    echo "❌ 数据库结构初始化失败"
    exit 1
fi

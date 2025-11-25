#!/bin/bash
set -e

cd "$(dirname "$0")"

# ==========================================
# 配置
# ==========================================
DB_HOST="${DB_HOST:-database}"
DB_USERNAME="${DB_USERNAME:-game}"
DB_PASSWORD="${DB_PASSWORD:-GamePass2024}"
DB_NAME="${DB_NAME:-galaxy2048}"

# ==========================================
# 等待数据库就绪
# ==========================================
echo "⏳ 等待数据库就绪..."
sleep 5

# ==========================================
# 应用数据库结构（建表）
# ==========================================
echo "📋 执行数据库结构初始化..."
gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d $DB_NAME -f /init-db/schema.sql

if [ $? -ne 0 ]; then
    echo "❌ 数据库结构初始化失败"
    exit 1
fi

echo "✅ 数据库结构初始化成功"

# ==========================================
# 插入初始数据
# ==========================================
echo "🌱 插入初始数据..."
gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USERNAME -W $DB_PASSWORD -d $DB_NAME <<'SQL'
-- 插入玩家（如果不存在）
INSERT INTO players (username)
SELECT username
FROM (VALUES ('demo'), ('alice'), ('bob')) AS t(username)
WHERE NOT EXISTS (SELECT 1 FROM players WHERE username = t.username);

-- 插入每日挑战（如果不存在）
INSERT INTO daily_challenge (day, seed, target_score, note)
SELECT CURRENT_DATE, FLOOR(EXTRACT(EPOCH FROM NOW())), 4096, '首日挑战：登顶 2048！'
WHERE NOT EXISTS (SELECT 1 FROM daily_challenge WHERE day = CURRENT_DATE);
SQL

if [ $? -ne 0 ]; then
    echo "⚠️  初始数据可能已存在或插入失败"
fi

echo "✅ 数据库初始化完成！"

# ==========================================
# 保持容器运行
# ==========================================
exec tail -f /dev/null

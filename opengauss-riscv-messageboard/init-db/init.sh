#!/bin/bash

cd "$(dirname "$0")"

# 设置密码环境变量
export PGPASSWORD=$DB_PASS

echo "开始初始化 openGauss 数据库..."

# 创建数据库
if gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USER -d postgres <<EOF
CREATE DATABASE $DB_NAME OWNER $DB_USER ENCODING 'UTF8' DBCOMPATIBILITY 'PG';
EOF
then
  echo "✅ 数据库创建成功"
  
  # 执行数据库结构初始化
  echo "执行数据库结构初始化..."
  gsql -v ON_ERROR_STOP=1 -h $DB_HOST -U $DB_USER -d $DB_NAME <schema.sql
  
  if [ $? -eq 0 ]; then
    echo "✅ 数据库结构初始化成功"
  else
    echo "❌ 数据库结构初始化失败"
    exit 1
  fi
else
  echo "数据库已存在，跳过创建"
fi

echo "✅ 数据库初始化完成！"
echo "保持容器运行..."

# 保持容器运行
exec tail -f /dev/null


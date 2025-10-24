"""测试数据库连接的各种方式"""
import pg8000
import os

DB_HOST = "database"
DB_USER = "msgboard"
DB_PASS = "Msgboard123"
DB_NAME = "messageboard"

print("测试 pg8000 连接...")

try:
    # 方式1：明确指定参数
    conn = pg8000.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        ssl_context=None  # 禁用 SSL
    )
    print("✅ 连接成功！")
    
    # 测试查询
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM messages")
    count = cursor.fetchone()[0]
    print(f"✅ 查询成功！留言数: {count}")
    
    conn.close()
    
except Exception as e:
    print(f"❌ 连接失败: {e}")
    import traceback
    traceback.print_exc()


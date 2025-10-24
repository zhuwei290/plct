"""
openGauss RISC-V 社区留言板 - 后端API服务
Slogan: 轻量级，高性能，开源芯

基于 FastAPI 框架，连接 openGauss 6.0.0-riscv64 数据库
"""

from fastapi import FastAPI, HTTPException, Request, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import create_engine, text, event
from sqlalchemy.dialects.postgresql import base as postgresql_base
from datetime import datetime, date
from typing import Optional, List
import os
import logging
import re
import hashlib
import secrets
import jwt

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 修复 openGauss 版本解析问题
original_get_server_version_info = postgresql_base.PGDialect._get_server_version_info

def patched_get_server_version_info(self, connection):
    try:
        return original_get_server_version_info(self, connection)
    except Exception as e:
        logger.warning(f"使用默认版本信息绕过版本解析问题: {e}")
        # 返回一个兼容的 PostgreSQL 版本号 (14.0)
        return (14, 0)

# 应用补丁
postgresql_base.PGDialect._get_server_version_info = patched_get_server_version_info

# ==========================================
# 认证配置
# ==========================================
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
security = HTTPBearer()

# ==========================================
# FastAPI 应用初始化
# ==========================================
app = FastAPI(
    title="openGauss RISC-V 留言板 API",
    description="轻量级，高性能，开源芯 - 基于 openGauss 数据库和 RISC-V 架构的现代化留言板系统",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议配置具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 数据库连接配置
# ==========================================
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://msgboard:MessageBoard2024!@database/messageboard"
)

try:
    # 使用 psycopg2 驱动（PostgreSQL 官方推荐，兼容性最好）
    # psycopg2 完全兼容 openGauss（基于 PostgreSQL）
    
    # 尝试使用 psycopg2 直接连接，绕过 SQLAlchemy 的一些问题
    try:
        import psycopg2
        from psycopg2 import sql
        
        # 解析连接URL
        url_parts = DATABASE_URL.replace("postgresql://", "").split("@")
        if len(url_parts) == 2:
            user_pass, host_db = url_parts
            user, password = user_pass.split(":")
            host, database = host_db.split("/")
        else:
            raise ValueError("无法解析数据库URL")
        
        # 直接使用 psycopg2 连接
        conn = psycopg2.connect(
            host=host,
            database=database,
            user=user,
            password=password,
            sslmode="disable"
        )
        
        # 测试连接
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        conn.close()
        
        logger.info("✅ 直接 psycopg2 连接测试成功")
        
        # 如果直接连接成功，使用简化的 SQLAlchemy 配置
        engine = create_engine(
            f"postgresql://{user}:{password}@{host}/{database}?sslmode=disable",
            pool_pre_ping=False,
            pool_size=5,
            max_overflow=10,
            echo=False
        )
        
    except Exception as e:
        logger.error(f"直接连接失败: {e}")
        # 回退到原始方法
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=False,
            pool_size=5,
            max_overflow=10,
            echo=False,
            connect_args={
                "sslmode": "disable"
            }
        )
    
    logger.info("✅ 数据库连接池初始化成功（使用 psycopg2 驱动）")
except Exception as e:
    logger.error(f"❌ 数据库连接失败: {e}")
    raise

# ==========================================
# Pydantic 数据模型
# ==========================================

class MessageCreate(BaseModel):
    """创建留言的请求模型"""
    username: str = Field(..., min_length=1, max_length=50, description="用户名")
    content: str = Field(..., min_length=1, max_length=5000, description="留言内容")
    email: Optional[EmailStr] = Field(None, description="邮箱地址（可选）")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "张三",
                "content": "openGauss 在 RISC-V 架构上运行得很流畅！",
                "email": "zhangsan@example.com"
            }
        }


class MessageResponse(BaseModel):
    """留言响应模型"""
    id: int
    username: str
    content: str
    email: Optional[str]
    likes: int
    created_at: datetime
    comment_count: int = 0


class CommentCreate(BaseModel):
    """创建评论的请求模型"""
    username: str = Field(..., min_length=1, max_length=50)
    content: str = Field(..., min_length=1, max_length=1000)


class Comment(BaseModel):
    """评论响应模型"""
    id: int
    username: str
    content: str
    created_at: datetime


class UserRegister(BaseModel):
    """用户注册模型"""
    username: str = Field(..., min_length=3, max_length=50, description="用户名")
    email: EmailStr = Field(..., description="邮箱地址")
    password: str = Field(..., min_length=6, max_length=100, description="密码")


class UserLogin(BaseModel):
    """用户登录模型"""
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class User(BaseModel):
    """用户响应模型"""
    id: int
    username: str
    email: str
    created_at: datetime


class Token(BaseModel):
    """令牌响应模型"""
    access_token: str
    token_type: str
    user: User


# ==========================================
# 认证工具函数
# ==========================================

def hash_password(password: str) -> str:
    """哈希密码"""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{pwd_hash.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    """验证密码"""
    try:
        salt, pwd_hash = hashed.split(':')
        pwd_hash_check = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return pwd_hash_check.hex() == pwd_hash
    except:
        return False

def create_access_token(data: dict) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """验证令牌"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="无效的令牌")

# ==========================================
# API 路由
# ==========================================

@app.get("/")
def root():
    """API 根路径 - 返回基本信息"""
    return {
        "name": "openGauss RISC-V 留言板",
        "slogan": "轻量级，高性能，开源芯",
        "version": "1.0.0",
        "database": "openGauss 6.0.0",
        "architecture": "RISC-V 64-bit",
        "framework": "FastAPI",
        "docs": "/api/docs",
        "endpoints": {
            "messages": "/api/messages",
            "stats": "/api/stats",
            "health": "/health"
        }
    }


@app.get("/health")
def health_check():
    """健康检查端点"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            db_version = result.scalar()
        return {
            "status": "healthy",
            "database": "connected",
            "db_version": db_version,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        raise HTTPException(status_code=503, detail=f"数据库连接失败: {str(e)}")


@app.get("/api/messages", response_model=List[MessageResponse])
def get_messages(
    limit: int = Query(50, ge=1, le=100, description="返回留言数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    order_by: str = Query("created_at", description="排序字段: created_at 或 likes")
):
    """
    获取留言列表
    
    - **limit**: 返回数量（1-100）
    - **offset**: 偏移量（用于分页）
    - **order_by**: 排序方式（created_at: 最新, likes: 最热）
    """
    try:
        order_clause = "created_at DESC" if order_by == "created_at" else "likes DESC, created_at DESC"
        
        with engine.connect() as conn:
            result = conn.execute(text(f"""
                SELECT 
                    m.id, 
                    m.username, 
                    m.content, 
                    m.email, 
                    m.likes, 
                    m.created_at,
                    (SELECT COUNT(*) FROM comments WHERE message_id = m.id) as comment_count
                FROM messages m
                WHERE m.status = 'approved'
                ORDER BY {order_clause}
                LIMIT :limit OFFSET :offset
            """), {"limit": limit, "offset": offset})
            
            messages = [dict(row._mapping) for row in result]
            logger.info(f"返回 {len(messages)} 条留言")
            return messages
            
    except Exception as e:
        logger.error(f"获取留言列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取留言失败: {str(e)}")


@app.post("/api/messages", response_model=MessageResponse, status_code=201)
async def create_message(message: MessageCreate, request: Request):
    """
    发表新留言
    
    自动记录IP地址和User-Agent，默认状态为已审核
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                INSERT INTO messages (username, content, email, ip_address, user_agent, status)
                VALUES (:username, :content, :email, :ip, :ua, 'approved')
                RETURNING id, username, content, email, likes, created_at
            """), {
                "username": message.username,
                "content": message.content,
                "email": message.email,
                "ip": request.client.host,
                "ua": request.headers.get("user-agent", "")[:500]
            })
            conn.commit()
            
            row = result.fetchone()
            new_message = dict(row._mapping)
            new_message['comment_count'] = 0
            
            logger.info(f"新留言创建: ID={new_message['id']}, 用户={message.username}")
            return new_message
            
    except Exception as e:
        logger.error(f"创建留言失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建留言失败: {str(e)}")


@app.get("/api/messages/{message_id}")
def get_message(message_id: int):
    """获取单条留言详情（包含评论）"""
    try:
        with engine.connect() as conn:
            # 获取留言
            result = conn.execute(text("""
                SELECT id, username, content, email, likes, created_at
                FROM messages
                WHERE id = :id AND status = 'approved'
            """), {"id": message_id})
            
            message = result.fetchone()
            if not message:
                raise HTTPException(status_code=404, detail="留言不存在")
            
            message_dict = dict(message._mapping)
            
            # 获取评论
            comments_result = conn.execute(text("""
                SELECT id, username, content, created_at
                FROM comments
                WHERE message_id = :id
                ORDER BY created_at ASC
            """), {"id": message_id})
            
            message_dict['comments'] = [dict(row._mapping) for row in comments_result]
            message_dict['comment_count'] = len(message_dict['comments'])
            
            return message_dict
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取留言详情失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/messages/{message_id}/like")
def like_message(message_id: int):
    """
    给留言点赞
    
    返回更新后的点赞数
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                UPDATE messages 
                SET likes = likes + 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = :id AND status = 'approved'
                RETURNING likes
            """), {"id": message_id})
            conn.commit()
            
            row = result.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="留言不存在")
            
            likes = row[0]
            logger.info(f"留言 {message_id} 点赞，当前 {likes} 赞")
            return {"message_id": message_id, "likes": likes}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"点赞失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/messages/{message_id}/comments", response_model=Comment, status_code=201)
def create_comment(message_id: int, comment: CommentCreate):
    """为留言添加评论"""
    try:
        with engine.connect() as conn:
            # 检查留言是否存在
            check = conn.execute(text("""
                SELECT id FROM messages WHERE id = :id AND status = 'approved'
            """), {"id": message_id})
            
            if not check.fetchone():
                raise HTTPException(status_code=404, detail="留言不存在")
            
            # 创建评论
            result = conn.execute(text("""
                INSERT INTO comments (message_id, username, content)
                VALUES (:msg_id, :username, :content)
                RETURNING id, username, content, created_at
            """), {
                "msg_id": message_id,
                "username": comment.username,
                "content": comment.content
            })
            conn.commit()
            
            new_comment = dict(result.fetchone()._mapping)
            logger.info(f"评论创建: 留言ID={message_id}, 用户={comment.username}")
            return new_comment
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建评论失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
def get_statistics():
    """
    获取统计信息
    
    展示 openGauss 的聚合查询能力
    """
    try:
        with engine.connect() as conn:
            stats = {}
            
            # 总留言数
            stats['total_messages'] = conn.execute(
                text("SELECT COUNT(*) FROM messages WHERE status='approved'")
            ).scalar()
            
            # 总点赞数
            stats['total_likes'] = conn.execute(
                text("SELECT COALESCE(SUM(likes), 0) FROM messages WHERE status='approved'")
            ).scalar()
            
            # 总评论数
            stats['total_comments'] = conn.execute(
                text("SELECT COUNT(*) FROM comments")
            ).scalar()
            
            # 今日新增留言
            stats['today_messages'] = conn.execute(text("""
                SELECT COUNT(*) FROM messages 
                WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day' AND status='approved'
            """)).scalar()
            
            # 最热留言（Top 5）
            popular = conn.execute(text("""
                SELECT id, username, content, likes 
                FROM messages 
                WHERE status = 'approved'
                ORDER BY likes DESC 
                LIMIT 5
            """))
            stats['popular_messages'] = [dict(row._mapping) for row in popular]
            
            # 最新留言（Top 5）
            recent = conn.execute(text("""
                SELECT id, username, content, created_at 
                FROM messages 
                WHERE status = 'approved'
                ORDER BY created_at DESC 
                LIMIT 5
            """))
            stats['recent_messages'] = [dict(row._mapping) for row in recent]
            
            # 数据库信息
            db_info = conn.execute(text("SELECT version()")).scalar()
            stats['database_info'] = {
                "version": db_info,
                "type": "openGauss",
                "architecture": "RISC-V 64-bit"
            }
            
            # 时间戳
            stats['generated_at'] = datetime.now().isoformat()
            
            logger.info("统计信息生成成功")
            return stats
            
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tags")
def get_tags():
    """获取所有标签"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, name, color, created_at
                FROM tags
                ORDER BY name
            """))
            return [dict(row._mapping) for row in result]
    except Exception as e:
        logger.error(f"获取标签失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 认证相关 API
# ==========================================

@app.post("/api/auth/register", response_model=dict)
def register_user(user_data: UserRegister):
    """用户注册"""
    try:
        with engine.connect() as conn:
            # 检查用户名是否已存在
            check_user = conn.execute(text("""
                SELECT id FROM users WHERE username = :username
            """), {"username": user_data.username})
            
            if check_user.fetchone():
                raise HTTPException(status_code=400, detail="用户名已存在")
            
            # 检查邮箱是否已存在
            check_email = conn.execute(text("""
                SELECT id FROM users WHERE email = :email
            """), {"email": user_data.email})
            
            if check_email.fetchone():
                raise HTTPException(status_code=400, detail="邮箱已被注册")
            
            # 创建用户
            hashed_password = hash_password(user_data.password)
            result = conn.execute(text("""
                INSERT INTO users (username, email, password_hash, created_at)
                VALUES (:username, :email, :password_hash, CURRENT_TIMESTAMP)
                RETURNING id, username, email, created_at
            """), {
                "username": user_data.username,
                "email": user_data.email,
                "password_hash": hashed_password
            })
            conn.commit()
            
            user = dict(result.fetchone()._mapping)
            logger.info(f"新用户注册: {user_data.username}")
            
            return {"message": "注册成功", "user": user}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户注册失败: {e}")
        raise HTTPException(status_code=500, detail="注册失败，请重试")


@app.post("/api/auth/login", response_model=Token)
def login_user(user_data: UserLogin):
    """用户登录"""
    try:
        with engine.connect() as conn:
            # 查找用户
            result = conn.execute(text("""
                SELECT id, username, email, password_hash, created_at
                FROM users WHERE username = :username
            """), {"username": user_data.username})
            
            user_row = result.fetchone()
            if not user_row:
                raise HTTPException(status_code=401, detail="用户名或密码错误")
            
            user = dict(user_row._mapping)
            
            # 验证密码
            if not verify_password(user_data.password, user['password_hash']):
                raise HTTPException(status_code=401, detail="用户名或密码错误")
            
            # 创建令牌
            access_token = create_access_token({
                "sub": str(user['id']),
                "username": user['username']
            })
            
            # 移除密码哈希
            del user['password_hash']
            
            logger.info(f"用户登录: {user_data.username}")
            
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "user": user
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"用户登录失败: {e}")
        raise HTTPException(status_code=500, detail="登录失败，请重试")


@app.get("/api/auth/me", response_model=User)
def get_current_user(payload: dict = Depends(verify_token)):
    """获取当前用户信息"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT id, username, email, created_at
                FROM users WHERE id = :user_id
            """), {"user_id": payload['sub']})
            
            user_row = result.fetchone()
            if not user_row:
                raise HTTPException(status_code=404, detail="用户不存在")
            
            return dict(user_row._mapping)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取用户信息失败: {e}")
        raise HTTPException(status_code=500, detail="获取用户信息失败")


# ==========================================
# 异常处理
# ==========================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    logger.error(f"未处理的异常: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"}
    )


# ==========================================
# 启动事件
# ==========================================

@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    logger.info("="*50)
    logger.info("🚀 openGauss RISC-V 留言板 API 启动")
    logger.info("Slogan: 轻量级，高性能，开源芯")
    logger.info(f"数据库: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'N/A'}")
    logger.info("="*50)


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭时执行"""
    logger.info("👋 API 服务正在关闭...")
    engine.dispose()
    logger.info("✅ 数据库连接已清理")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")


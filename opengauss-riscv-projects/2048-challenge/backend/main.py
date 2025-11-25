import os
import random
from datetime import date, datetime, timedelta
from typing import Any, List, Optional
import logging

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    text,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import base as postgresql_base

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

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://game:GamePass2024@database:5432/galaxy2048"
)
DAILY_TARGET_SCORE = int(os.getenv("DAILY_TARGET_SCORE", "4096"))
DAILY_SEED_ROLL_AHEAD = int(os.getenv("DAILY_SEED_ROLL_AHEAD", "0"))

# 使用普通 psycopg2 驱动连接数据库
try:
    # 尝试使用 psycopg2 直接连接，绕过 SQLAlchemy 的一些问题
    try:
        import psycopg2
        
        # 解析连接URL
        url_parts = DATABASE_URL.replace("postgresql://", "").split("@")
        if len(url_parts) == 2:
            user_pass, host_db = url_parts
            user, password = user_pass.split(":")
            if "/" in host_db:
                host_port, database = host_db.split("/", 1)
                if ":" in host_port:
                    host, port = host_port.split(":")
                else:
                    host = host_port
                    port = "5432"
            else:
                host = host_db
                port = "5432"
                database = "postgres"
        else:
            raise ValueError("无法解析数据库URL")
        
        # 直接使用 psycopg2 连接测试
        conn = psycopg2.connect(
            host=host,
            port=int(port),
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
            f"postgresql://{user}:{password}@{host}:{port}/{database}?sslmode=disable",
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

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()

# -------------------------------------------
# 数据库模型
# -------------------------------------------
class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    avatar_url = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)

    games = relationship("Game", back_populates="player")


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (
        CheckConstraint("score >= 0"),
        CheckConstraint("moves >= 0"),
        CheckConstraint("duration_ms >= 0"),
    )

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id", ondelete="SET NULL"))
    mode = Column(String(10), nullable=False, default="free")
    seed = Column(BigInteger)
    score = Column(Integer, nullable=False, default=0)
    moves = Column(Integer, nullable=False, default=0)
    duration_ms = Column(Integer, nullable=False, default=0)
    finished_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player", back_populates="games")
    steps = relationship("GameStep", back_populates="game", cascade="all, delete-orphan")


class GameStep(Base):
    __tablename__ = "game_steps"

    id = Column(Integer, primary_key=True, index=True)
    game_id = Column(Integer, ForeignKey("games.id", ondelete="CASCADE"))
    step_order = Column(Integer, nullable=False)
    move = Column(String(1), nullable=False)
    board_state = Column(JSON)

    game = relationship("Game", back_populates="steps")

    __table_args__ = (
        CheckConstraint("step_order >= 0"),
        CheckConstraint("move IN ('U','D','L','R')"),
        UniqueConstraint("game_id", "step_order", name="uq_game_step_order"),
    )


class DailyChallenge(Base):
    __tablename__ = "daily_challenge"

    day = Column(Date, primary_key=True)
    seed = Column(BigInteger, nullable=False)
    target_score = Column(Integer, nullable=False, default=DAILY_TARGET_SCORE)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

# -------------------------------------------
# 工具函数
# -------------------------------------------
def create_all_tables() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_or_create_player(db: Session, username: Optional[str]) -> Optional[Player]:
    if not username:
        return None
    player = db.query(Player).filter(Player.username == username).first()
    if player:
        return player
    player = Player(username=username)
    db.add(player)
    db.commit()
    db.refresh(player)
    return player


def get_or_create_daily(db: Session, day: date) -> DailyChallenge:
    challenge = db.query(DailyChallenge).filter(DailyChallenge.day == day).first()
    if challenge:
        return challenge
    seed_base = int(datetime.utcnow().timestamp())
    seed = seed_base + DAILY_SEED_ROLL_AHEAD
    challenge = DailyChallenge(
        day=day,
        seed=seed,
        target_score=DAILY_TARGET_SCORE,
        note=f"目标分 {DAILY_TARGET_SCORE}",
    )
    db.add(challenge)
    db.commit()
    return challenge

# -------------------------------------------
# FastAPI 初始化
# -------------------------------------------
app = FastAPI(title="2048 Galaxy Challenge API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_all_tables()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# -------------------------------------------
# Pydantic 模型
# -------------------------------------------
class SessionCreatePayload(BaseModel):
    mode: str = Field(default="free", description="free、daily 或 streak")
    username: Optional[str] = Field(default=None, max_length=50)
    seed: Optional[int] = Field(default=None, ge=0)

    @validator("mode")
    def validate_mode(cls, value: str) -> str:
        allowed = {"free", "daily", "streak"}
        if value not in allowed:
            raise ValueError(f"mode 必须是 {allowed}")
        return value


class StepPayload(BaseModel):
    move: str = Field(regex="^[UDLR]$")
    board: Optional[List[List[int]]] = None


class SessionFinishPayload(BaseModel):
    score: int = Field(ge=0)
    moves: int = Field(ge=0)
    duration_ms: int = Field(ge=0)
    steps: List[StepPayload] = Field(default_factory=list)


class SessionResponse(BaseModel):
    id: int
    mode: str
    seed: int
    player: Optional[str]
    created_at: datetime


class DailyResponse(BaseModel):
    day: date
    seed: int
    target_score: int
    note: Optional[str]


class LeaderboardEntry(BaseModel):
    rank: int
    player: Optional[str]
    score: int
    duration_ms: int
    finished_at: datetime


class ReplayResponse(BaseModel):
    game_id: int
    steps: List[dict]

# -------------------------------------------
# API 路由
# -------------------------------------------
@app.post("/games/api/session", response_model=SessionResponse)
def create_session(payload: SessionCreatePayload, db: Session = Depends(get_db)):
    player = get_or_create_player(db, payload.username)
    seed: int
    if payload.mode == "daily":
        challenge = get_or_create_daily(db, date.today())
        seed = challenge.seed
        player_id = player.id if player else None
        existing = (
            db.query(Game)
            .filter(
                Game.player_id == player_id,
                Game.seed == seed,
                Game.mode == "daily",
            )
            .first()
        )
        if existing:
            return SessionResponse(
                id=existing.id,
                mode=existing.mode,
                seed=existing.seed,
                player=player.username if player else None,
                created_at=existing.created_at,
            )
    else:
        seed = payload.seed if payload.seed is not None else random.getrandbits(32)

    game = Game(
        player_id=player.id if player else None,
        mode=payload.mode,
        seed=seed,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return SessionResponse(
        id=game.id,
        mode=game.mode,
        seed=game.seed,
        player=player.username if player else None,
        created_at=game.created_at,
    )


@app.post("/games/api/session/{game_id}/finish")
def finish_session(
    game_id: int, payload: SessionFinishPayload, db: Session = Depends(get_db)
):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="未找到对应对局")

    game.score = payload.score
    game.moves = payload.moves
    game.duration_ms = payload.duration_ms
    game.finished_at = datetime.utcnow()

    db.query(GameStep).filter(GameStep.game_id == game.id).delete()

    for idx, step in enumerate(payload.steps):
        board_state: Optional[Any] = step.board if step.board is not None else None
        db.add(
            GameStep(
                game_id=game.id,
                step_order=idx,
                move=step.move,
                board_state=board_state,
            )
        )

    db.commit()
    return {"status": "ok", "game_id": game.id}


@app.get("/games/api/leaderboard", response_model=List[LeaderboardEntry])
def leaderboard(
    scope: str = Query(default="daily", regex="^(daily|week|all)$"),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Game).filter(Game.score > 0)

    if scope == "daily":
        day_start = datetime.combine(date.today(), datetime.min.time())
        query = query.filter(Game.finished_at >= day_start)
    elif scope == "week":
        day_start = datetime.combine(date.today(), datetime.min.time()) - timedelta(days=7)
        query = query.filter(Game.finished_at >= day_start)

    query = query.order_by(Game.score.desc(), Game.duration_ms.asc())
    results = query.limit(limit).all()

    leaderboard_entries: List[LeaderboardEntry] = []
    for idx, g in enumerate(results, start=1):
        leaderboard_entries.append(
            LeaderboardEntry(
                rank=idx,
                player=g.player.username if g.player else None,
                score=g.score,
                duration_ms=g.duration_ms,
                finished_at=g.finished_at,
            )
        )
    return leaderboard_entries


@app.get("/games/api/daily", response_model=DailyResponse)
def daily_challenge(db: Session = Depends(get_db)):
    challenge = get_or_create_daily(db, date.today())
    return DailyResponse(
        day=challenge.day,
        seed=challenge.seed,
        target_score=challenge.target_score,
        note=challenge.note,
    )


@app.get("/games/api/replay/{game_id}", response_model=ReplayResponse)
def replay(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="未找到对局")

    steps_payload = [
        {
            "order": step.step_order,
            "move": step.move,
            "board": step.board_state,
        }
        for step in sorted(game.steps, key=lambda s: s.step_order)
    ]
    return ReplayResponse(game_id=game.id, steps=steps_payload)


@app.get("/games/api/health")
def api_health():
    return health()


@app.exception_handler(SQLAlchemyError)
def sqlalchemy_exception_handler(_, exc: SQLAlchemyError):
    return HTTPException(status_code=500, detail=f"数据库异常: {exc}")

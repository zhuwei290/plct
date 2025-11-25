# 2048 银河挑战（2048 Galaxy Challenge）

## 项目概述
- **目标用户**：喜爱益智小游戏的访客，支持游客与登录用户。
- **核心玩法**：经典 2048、每日挑战（同 seed PK）、连胜模式、步数回放。
- **技术栈**：Vue 3 + Pinia（前端）、FastAPI（后端，可替换为 Spring Boot）、openGauss（数据库）、Docker Compose 部署。

## 架构概览
- 前端容器提供静态页面与 PWA 功能。
- 后端 FastAPI 提供对局管理、排行榜与数据校验。
- openGauss 存储玩家、对局、每日挑战、操作回放等核心数据。
- 腾讯云 Nginx 网关统一暴露 `/games/2048`（前端）与 `/games/api/*`（后端）。

## 端口规划
| 组件 | 端口 | 说明 |
|------|------|------|
| 前端容器 (Vue) | 8003 | 通过网关 `/games/2048` 暴露 |
| 后端 API (FastAPI) | 8004 | 网关 `/games/api/*` 代理，也可关闭直连 |
| openGauss | 5432 | 仅 SG2042 内网访问 |

## 数据库设计
### 核心表
```sql
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id),
    mode VARCHAR(10) CHECK (mode IN ('free', 'daily', 'streak')),
    seed BIGINT,
    score INT NOT NULL,
    moves INT NOT NULL,
    duration_ms INT NOT NULL,
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_steps (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    step_order SMALLINT,
    move CHAR(1) CHECK (move IN ('U','D','L','R')),
    board_state JSONB
);

CREATE TABLE daily_challenge (
    day DATE PRIMARY KEY,
    seed BIGINT NOT NULL,
    target_score INT,
    note TEXT
);

CREATE MATERIALIZED VIEW mv_daily_leaderboard AS
SELECT dc.day,
       g.player_id,
       MAX(g.score) AS best_score,
       MIN(g.duration_ms) AS best_time,
       COUNT(*)       AS attempts
FROM daily_challenge dc
JOIN games g ON g.seed = dc.seed
GROUP BY dc.day, g.player_id;
```

### 索引与约束
- `CREATE INDEX idx_games_player_mode ON games(player_id, mode);`
- `CREATE UNIQUE INDEX idx_daily_seed_unique ON games(player_id, seed) WHERE mode = 'daily';`
- `CREATE INDEX idx_steps_game_order ON game_steps(game_id, step_order);`

### 特色能力
- JSONB 存储棋盘状态，支持回放。
- 物化视图每日刷新，提供排行榜查询；可结合 Celery/Crontab 定时刷新。
- 触发器（可选）限制 `moves` 与 `score` 的合理区间，防止作弊。

## Docker Compose 摘要
```yaml
services:
  games-frontend:
    build: ./frontend
    ports:
      - "8003:80"
    depends_on:
      games-backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  games-backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://game:GamePass2024@opengauss:5432/galaxy2048
      - DAILY_TARGET_SCORE=4096
    ports:
      - "8004:8004"
    depends_on:
      opengauss:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 30s
      timeout: 10s
      retries: 5

  opengauss:
    image: xfan1024/opengauss:6.0.0-riscv64
    environment:
      - OPENGAUSS_USER=game
      - OPENGAUSS_PASSWORD=GamePass2024
      - OPENGAUSS_DB=galaxy2048
    volumes:
      - games_db:/var/lib/opengauss
    healthcheck:
      test: ["CMD-SHELL", "gsql -d galaxy2048 -c 'SELECT 1' > /dev/null"]
      interval: 30s
      retries: 10

volumes:
  games_db:
```

## 网关接入（nginx-gateway/nginx.conf 片段）
```nginx
    upstream games-frontend { server 127.0.0.1:8003; }
    upstream games-backend  { server 127.0.0.1:8004; }

    location /games/api/ {
        proxy_pass http://games-backend/games/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS 头
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
        
        if ($request_method = 'OPTIONS') {
            return 204;
        }
    }

    location /games/2048 {
        rewrite ^/games/2048(.*)$ $1 break;
        proxy_pass http://games-frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
```

## API 设计
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/games/api/session` | 创建新对局 `{mode, seed?}` |
| POST | `/games/api/session/{id}/finish` | 结算成绩 `{score, moves, duration_ms, steps[]}` |
| GET  | `/games/api/leaderboard?scope=daily|week|all` | 排行榜 |
| GET  | `/games/api/daily` | 获取每日挑战种子/目标 |
| GET  | `/games/api/replay/{id}` | 获取操作序列和回放数据 |
| GET  | `/games/api/health` | 健康检查（同 `/health`） |

示例：
```bash
curl -X POST http://localhost:8004/games/api/session \
  -H "Content-Type: application/json" \
  -d '{"mode":"daily"}'

curl -X POST http://localhost:8004/games/api/session/123/finish \
  -H "Content-Type: application/json" \
  -d '{"score":4096,"moves":140,"duration_ms":52000,"steps":[{"move":"L","board":null},{"move":"U","board":null},{"move":"R","board":null}]}'
```

## 初始化脚本
```sql
INSERT INTO players (username) VALUES ('demo'), ('alice'), ('bob');
INSERT INTO daily_challenge(day, seed, target_score, note)
VALUES (CURRENT_DATE, 20241112, 4096, '本周目标 4096！');
```

## 功能扩展建议
- **成就系统**：首胜、连胜、极速通关、最小步数等。
- **AI 复盘**：使用规则或 LLM 分析用户操作，推荐更优策略。
- **观战模式**：WebSocket 推送实时棋盘给观众。
- **防作弊**：校验 moves、score，服务器重放验证高分。
- **移动端优化**：PWA 离线支持，数据同步校验。

## 测试与运维
- 单元测试：随机数生成、得分计算、排行榜 SQL。
- 压测：使用 Locust/JMeter 模拟 1k 并发提交成绩。
- 监控：openGauss 慢查询、磁盘占用；后端 Prometheus 指标。
- 备份：定期导出 `daily_challenge`、`games`、`game_steps`。


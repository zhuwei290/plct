CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id),
    mode VARCHAR(10) CHECK (mode IN ('free', 'daily', 'streak')),
    seed BIGINT,
    score INT NOT NULL DEFAULT 0,
    moves INT NOT NULL DEFAULT 0,
    duration_ms INT NOT NULL DEFAULT 0,
    finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS game_steps (
    id SERIAL PRIMARY KEY,
    game_id INT REFERENCES games(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    move CHAR(1) CHECK (move IN ('U','D','L','R')),
    board_state JSON,
    UNIQUE (game_id, step_order)
);

CREATE TABLE IF NOT EXISTS daily_challenge (
    day DATE PRIMARY KEY,
    seed BIGINT NOT NULL,
    target_score INT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 物化视图：openGauss 不支持 IF NOT EXISTS，需要先删除再创建
DROP MATERIALIZED VIEW IF EXISTS mv_daily_leaderboard;
CREATE MATERIALIZED VIEW mv_daily_leaderboard AS
SELECT dc.day,
       g.player_id,
       MAX(g.score) AS best_score,
       MIN(g.duration_ms) AS best_time,
       COUNT(*) AS attempts
FROM daily_challenge dc
JOIN games g ON g.seed = dc.seed
GROUP BY dc.day, g.player_id;

-- 索引：openGauss 支持 IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_games_player_mode ON games(player_id, mode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_seed_unique
ON games(player_id, seed) WHERE mode = 'daily';
CREATE INDEX IF NOT EXISTS idx_steps_game_order ON game_steps(game_id, step_order);


-- openGauss RISC-V 社区留言板数据库结构
-- 创建时间: 2025-10-23
-- 数据库: openGauss 6.0.0-riscv64

-- =====================================================
-- 用户表
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 用户表注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.email IS '邮箱地址';
COMMENT ON COLUMN users.password_hash IS '密码哈希';

-- =====================================================
-- 留言表
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    email VARCHAR(100),
    avatar_url VARCHAR(255),
    likes INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'approved', -- approved, pending, deleted
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 留言表索引
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_likes ON messages(likes DESC);

-- 留言表注释
COMMENT ON TABLE messages IS '留言主表';
COMMENT ON COLUMN messages.username IS '用户名';
COMMENT ON COLUMN messages.content IS '留言内容';
COMMENT ON COLUMN messages.email IS '邮箱地址';
COMMENT ON COLUMN messages.likes IS '点赞数';
COMMENT ON COLUMN messages.status IS '状态: approved-已审核, pending-待审核, deleted-已删除';

-- =====================================================
-- 评论表
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 评论表索引
CREATE INDEX idx_comments_message_id ON comments(message_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 评论表注释
COMMENT ON TABLE comments IS '评论表';
COMMENT ON COLUMN comments.message_id IS '关联的留言ID';

-- =====================================================
-- 统计表
-- =====================================================
CREATE TABLE IF NOT EXISTS statistics (
    id SERIAL PRIMARY KEY,
    date DATE DEFAULT CURRENT_DATE UNIQUE,
    total_messages INTEGER DEFAULT 0,
    total_visitors INTEGER DEFAULT 0,
    total_likes INTEGER DEFAULT 0,
    platform_info JSONB -- 存储访问平台统计
);

-- 统计表索引
CREATE INDEX idx_statistics_date ON statistics(date DESC);

-- =====================================================
-- 标签表
-- =====================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 留言-标签关联表
CREATE TABLE IF NOT EXISTS message_tags (
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (message_id, tag_id)
);

-- =====================================================
-- 视图：热门留言
-- =====================================================
CREATE OR REPLACE VIEW popular_messages AS
SELECT 
    id, 
    username, 
    content, 
    likes, 
    created_at,
    (SELECT COUNT(*) FROM comments WHERE message_id = messages.id) as comment_count
FROM messages
WHERE status = 'approved' AND likes > 0
ORDER BY likes DESC, created_at DESC
LIMIT 10;

-- =====================================================
-- 视图：今日统计
-- =====================================================
CREATE OR REPLACE VIEW today_stats AS
SELECT 
    COUNT(*) as messages_today,
    SUM(likes) as likes_today,
    COUNT(DISTINCT username) as users_today
FROM messages
WHERE DATE(created_at) = CURRENT_DATE AND status = 'approved';

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入欢迎留言
INSERT INTO messages (username, content, email, likes, status) VALUES
('openGauss SIG', '🎉 欢迎来到 openGauss RISC-V 社区留言板！这是一个基于 openGauss 6.0.0 数据库和 RISC-V 架构的轻量级高性能应用示例。', 'sig@opengauss.org', 15, 'approved'),
('RISC-V 开发者', '在 RISC-V 架构上运行 openGauss，性能表现优秀！开源指令集 + 开源数据库 = 完美组合 🚀', 'dev@riscv.org', 8, 'approved'),
('数据库爱好者', '这个演示项目代码简洁，架构清晰，值得学习参考。Docker Compose 一键部署，非常方便！', 'fan@example.com', 5, 'approved'),
('技术探索者', 'openGauss 的企业级特性让人印象深刻，期待在更多场景中应用。', 'tech@example.com', 3, 'approved'),
('开源贡献者', '支持国产开源数据库和 RISC-V 生态发展！💪', 'oss@example.com', 7, 'approved');

-- 插入示例评论
INSERT INTO comments (message_id, username, content) VALUES
(1, '新手开发者', '谢谢分享，正在学习中！'),
(1, '架构师', '这个技术栈很有前景'),
(2, '性能工程师', '有做过压测吗？数据如何？'),
(3, '学生', '代码写得很规范，学到了');

-- 插入默认标签
INSERT INTO tags (name, color) VALUES
('openGauss', '#0066CC'),
('RISC-V', '#FF6B6B'),
('Docker', '#2496ED'),
('Python', '#3776AB'),
('Vue.js', '#42B883'),
('教程', '#FFA500'),
('问题', '#DC143C'),
('建议', '#32CD32');

-- 为欢迎留言添加标签
INSERT INTO message_tags (message_id, tag_id) VALUES
(1, 1), (1, 2),
(2, 1), (2, 2),
(3, 3), (3, 4),
(4, 1),
(5, 1), (5, 2);

-- 初始化统计数据
INSERT INTO statistics (date, total_messages, total_visitors, total_likes, platform_info) VALUES
(CURRENT_DATE, 5, 10, 38, '{"riscv64": 7, "x86_64": 3}'::jsonb);

-- =====================================================
-- 完成
-- =====================================================
SELECT '✅ 数据库结构和初始数据创建完成！' as result;
SELECT 'Database: openGauss 6.0.0-riscv64' as info;
SELECT 'Tables created: ' || COUNT(*) || ' tables' as tables_count FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';


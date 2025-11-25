-- Go Library 图书管理系统数据库结构
-- 数据库: openGauss 6.0.0-riscv64

-- =====================================================
-- 用户表（读者）
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'reader', -- reader, admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =====================================================
-- 图书分类表
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 分类索引
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- =====================================================
-- 图书表
-- =====================================================
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    publisher VARCHAR(100),
    publish_date DATE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    total_copies INTEGER DEFAULT 1,
    available_copies INTEGER DEFAULT 1,
    location VARCHAR(50),
    description TEXT,
    cover_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 图书索引
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category_id);

-- =====================================================
-- 借阅记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS borrowings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    return_date TIMESTAMP,
    renew_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'borrowed', -- borrowed, returned, overdue
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 借阅记录索引
CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_book_id ON borrowings(book_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
CREATE INDEX IF NOT EXISTS idx_borrowings_due_date ON borrowings(due_date);

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入默认分类
-- 插入初始分类数据（仅在表为空时插入）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
        INSERT INTO categories (name, description) VALUES
            ('文学', '文学类图书'),
            ('科技', '科学技术类图书'),
            ('历史', '历史类图书'),
            ('艺术', '艺术类图书'),
            ('教育', '教育类图书'),
            ('计算机', '计算机类图书'),
            ('经济', '经济管理类图书'),
            ('其他', '其他类图书');
    END IF;
END $$;

-- 表注释
COMMENT ON TABLE users IS '用户表（读者）';
COMMENT ON TABLE categories IS '图书分类表';
COMMENT ON TABLE books IS '图书表';
COMMENT ON TABLE borrowings IS '借阅记录表';

COMMENT ON COLUMN users.role IS '用户角色: reader-读者, admin-管理员';
COMMENT ON COLUMN books.total_copies IS '图书总数';
COMMENT ON COLUMN books.available_copies IS '可借数量';
COMMENT ON COLUMN borrowings.status IS '借阅状态: borrowed-已借出, returned-已归还, overdue-逾期';

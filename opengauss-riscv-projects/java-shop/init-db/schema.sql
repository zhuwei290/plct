-- =====================================================
-- Java Shop 在线商城数据库结构
-- =====================================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    real_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'customer',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INTEGER,
    icon VARCHAR(100),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id),
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    images TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 购物车表
CREATE TABLE IF NOT EXISTS carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_time TIMESTAMP,
    shipping_address TEXT,
    receiver_name VARCHAR(100),
    receiver_phone VARCHAR(20),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(200),
    product_price DECIMAL(10,2),
    quantity INTEGER,
    subtotal DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    province VARCHAR(50),
    city VARCHAR(50),
    district VARCHAR(50),
    detail_address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- =====================================================
-- 初始数据
-- =====================================================

-- 插入商品分类
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
        INSERT INTO categories (name, description, icon, sort_order) VALUES
            ('电子产品', '手机、电脑、相机等', '📱', 1),
            ('服装鞋包', '男装、女装、鞋子、箱包', '👔', 2),
            ('食品饮料', '零食、饮料、生鲜', '🍔', 3),
            ('图书音像', '图书、电子书、音乐', '📚', 4),
            ('运动户外', '运动器材、户外用品', '⚽', 5),
            ('家居家装', '家具、装饰、厨具', '🏠', 6),
            ('美妆个护', '化妆品、护肤品', '💄', 7),
            ('母婴玩具', '奶粉、玩具、童装', '🍼', 8);
    END IF;
END $$;

-- 插入示例商品
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM products LIMIT 1) THEN
        INSERT INTO products (name, description, category_id, price, original_price, stock, image_url, status) VALUES
            ('iPhone 15 Pro', '最新款苹果手机，A17 Pro芯片', 1, 7999.00, 8999.00, 100, 'https://via.placeholder.com/300x300?text=iPhone+15', 'active'),
            ('MacBook Pro 16', '专业级笔记本电脑，M3 Max芯片', 1, 19999.00, 22999.00, 50, 'https://via.placeholder.com/300x300?text=MacBook+Pro', 'active'),
            ('AirPods Pro 2', '主动降噪无线耳机', 1, 1899.00, 1999.00, 200, 'https://via.placeholder.com/300x300?text=AirPods', 'active'),
            ('Nike Air Max', '经典跑步鞋', 2, 799.00, 999.00, 150, 'https://via.placeholder.com/300x300?text=Nike+Shoes', 'active'),
            ('The Lean Startup', '精益创业', 4, 59.00, 79.00, 500, 'https://via.placeholder.com/300x300?text=Book', 'active'),
            ('咖啡豆 1kg', '精品阿拉比卡咖啡豆', 3, 129.00, 159.00, 300, 'https://via.placeholder.com/300x300?text=Coffee', 'active');
    END IF;
END $$;

-- 表注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE categories IS '商品分类表';
COMMENT ON TABLE products IS '商品表';
COMMENT ON TABLE carts IS '购物车表';
COMMENT ON TABLE orders IS '订单表';
COMMENT ON TABLE order_items IS '订单明细表';
COMMENT ON TABLE addresses IS '收货地址表';

COMMENT ON COLUMN users.role IS '用户角色: customer-顾客, admin-管理员';
COMMENT ON COLUMN products.status IS '商品状态: active-上架, inactive-下架';
COMMENT ON COLUMN orders.status IS '订单状态: pending-待付款, paid-已付款, shipped-已发货, completed-已完成, cancelled-已取消';

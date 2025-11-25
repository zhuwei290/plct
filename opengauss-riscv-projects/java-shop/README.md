# Java Shop - 在线商城系统

基于 Spring Boot + MyBatis + openGauss 的在线购物系统，运行在 RISC-V 架构上。

## 功能特性

### 用户功能
- 👤 **用户认证**: 注册、登录、JWT 认证
- 📦 **商品浏览**: 商品列表、搜索、分类筛选
- 🛒 **购物车**: 添加商品、修改数量、删除商品
- 📝 **订单管理**: 创建订单、查看订单、订单状态

### 管理员功能
- ➕ **商品管理**: 添加、编辑商品
- 📊 **分类管理**: 管理商品分类

### 系统特性
- 🔒 **权限控制**: 基于 JWT 的认证和权限管理
- 💾 **数据持久化**: MyBatis + openGauss
- 🎨 **响应式UI**: 现代化的用户界面
- 🐳 **容器化**: Docker + Docker Compose

## 技术栈

### 后端
- **框架**: Spring Boot 3.2.0
- **数据访问**: MyBatis 3.0.3
- **数据库**: openGauss 6.0.0 (兼容 PostgreSQL)
- **认证**: JWT (jjwt 0.12.3)
- **密码加密**: BCrypt
- **构建工具**: Maven

### 前端
- **技术**: HTML5 + CSS3 + JavaScript (ES6+)
- **服务器**: Nginx

### 架构
- **平台**: RISC-V 64
- **容器化**: Docker + Docker Compose
- **数据库**: openGauss (PostgreSQL 兼容)

## 快速开始

### 1. 环境要求

- Docker
- Docker Compose
- RISC-V 架构环境（或兼容平台）

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，修改数据库密码和 JWT 密钥
```

### 3. 启动服务

```bash
# 使用启动脚本
chmod +x start-app.sh
./start-app.sh

# 或手动启动
docker-compose up -d
```

### 4. 访问系统

- **前端页面**: http://localhost:8010
- **后端 API**: http://localhost:8009
- **健康检查**: http://localhost:8009/api/health

### 5. 默认账号

第一个注册的用户自动成为管理员。

## API 文档

### 认证 API

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 商品 API

- `GET /api/products` - 获取商品列表
- `GET /api/products/:id` - 获取商品详情
- `GET /api/categories` - 获取分类列表
- `POST /api/admin/products` - 添加商品（管理员）
- `PUT /api/admin/products/:id` - 更新商品（管理员）

### 购物车 API

- `GET /api/cart` - 获取购物车
- `POST /api/cart` - 添加商品到购物车
- `PUT /api/cart/:productId` - 更新商品数量
- `DELETE /api/cart/:id` - 删除商品
- `DELETE /api/cart` - 清空购物车

### 订单 API

- `GET /api/orders` - 获取订单列表
- `GET /api/orders/:id` - 获取订单详情
- `POST /api/orders` - 创建订单
- `POST /api/orders/:id/pay` - 支付订单
- `POST /api/orders/:id/cancel` - 取消订单

## 数据库结构

### 主要表

- **users**: 用户表
- **categories**: 商品分类表
- **products**: 商品表
- **carts**: 购物车表
- **orders**: 订单表
- **order_items**: 订单明细表
- **addresses**: 收货地址表

## 业务规则

1. **库存管理**: 下单时自动扣减库存
2. **订单状态**: pending → paid → shipped → completed
3. **权限控制**: 
   - 第一个注册用户为管理员
   - 管理员可以管理商品
   - 所有用户可以浏览和购买

## 开发指南

### 后端开发

```bash
cd backend

# 编译
mvn clean package

# 运行
java -jar target/*.jar

# 开发模式（热重载）
mvn spring-boot:run
```

### 数据库管理

```bash
# 连接数据库
docker exec -it og-shop-db gsql -d shopdb -U shopuser

# 查看表
\dt

# 查看数据
SELECT * FROM products;
```

### 日志查看

```bash
# 查看所有日志
docker-compose logs -f

# 查看后端日志
docker-compose logs -f shop-backend

# 查看数据库日志
docker-compose logs -f database
```

## 故障排查

### 数据库连接失败

1. 检查数据库容器状态：`docker-compose ps`
2. 查看数据库日志：`docker-compose logs database`
3. 验证环境变量配置：检查 `.env` 文件

### 后端启动失败

1. 查看后端日志：`docker-compose logs shop-backend`
2. 检查 Maven 构建：可能需要重新构建镜像
3. 验证数据库连接：确保数据库已就绪

### 前端无法访问

1. 检查 Nginx 容器状态
2. 验证端口映射：确保 8010 端口未被占用
3. 清除浏览器缓存

## 端口说明

| 服务 | 容器端口 | 主机端口 | 说明 |
|------|---------|---------|------|
| 前端 | 80 | 8010 | Nginx Web 服务器 |
| 后端 | 8009 | 8009 | Spring Boot API |
| 数据库 | 5432 | 5435 | openGauss |

## 性能优化

- **连接池**: HikariCP 配置了合理的连接池参数
- **索引**: 主要查询字段都建立了索引
- **缓存**: 可以添加 Redis 缓存提升性能
- **CDN**: 静态资源可以使用 CDN 加速

## 安全建议

1. **修改默认密码**: 生产环境必须修改 `.env` 中的密码
2. **JWT 密钥**: 使用强随机密钥
3. **HTTPS**: 生产环境启用 HTTPS
4. **输入验证**: 后端已包含基本验证，可根据需要增强
5. **SQL 注入防护**: MyBatis 参数化查询防止 SQL 注入

## 作者



J132 openGauss RISC-V 实习生- zhuwei

## 许可证

MIT License

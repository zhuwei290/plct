# Go Library 图书管理系统

基于 Go + Gin + openGauss + RISC-V 的图书借阅管理系统

## 功能特性

### 📚 图书管理
- 图书添加、编辑、删除（管理员）
- 图书分类管理
- 图书搜索（书名、作者、ISBN）
- 图书库存管理

### 📖 借阅管理
- 在线借书
- 图书归还
- 图书续借（最多2次）
- 借阅历史查看
- 逾期提醒

### 👥 用户管理
- 用户注册、登录
- 读者和管理员角色
- 个人信息管理
- 借阅历史记录

### 📊 统计功能
- 图书总数统计
- 借阅情况统计
- 库存情况统计

## 技术栈

- **后端**: Go 1.21 + Gin + GORM
- **数据库**: openGauss 6.0.0-riscv64
- **前端**: HTML5 + CSS3 + JavaScript
- **容器化**: Docker + Docker Compose

## 快速开始

### 1. 环境要求

- Docker
- Docker Compose
- openGauss 6.0.0-riscv64 镜像

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，修改数据库密码和 JWT 密钥
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 4. 访问系统

- 前端页面: http://localhost:8008
- 后端 API: http://localhost:8007
- 健康检查: http://localhost:8007/health

### 5. 默认账号

系统首个注册用户自动设为管理员，后续注册为普通读者。

## API 文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 图书接口

- `GET /api/books` - 获取图书列表
- `GET /api/books/:id` - 获取图书详情
- `POST /api/admin/books` - 添加图书（管理员）
- `PUT /api/admin/books/:id` - 更新图书（管理员）
- `DELETE /api/admin/books/:id` - 删除图书（管理员）

### 借阅接口

- `GET /api/borrowings` - 获取借阅记录
- `POST /api/borrowings` - 借书
- `POST /api/borrowings/:id/return` - 还书
- `POST /api/borrowings/:id/renew` - 续借

### 其他接口

- `GET /api/categories` - 获取分类列表
- `GET /api/stats` - 获取统计信息
- `GET /health` - 健康检查

## 数据库结构

### users 表（用户）
- id: 用户ID
- username: 用户名
- email: 邮箱
- password_hash: 密码哈希
- real_name: 真实姓名
- phone: 电话
- role: 角色（reader/admin）

### categories 表（分类）
- id: 分类ID
- name: 分类名称
- description: 描述

### books 表（图书）
- id: 图书ID
- isbn: ISBN号
- title: 书名
- author: 作者
- publisher: 出版社
- publish_date: 出版日期
- category_id: 分类ID
- total_copies: 总副本数
- available_copies: 可借数量
- location: 位置
- description: 简介
- cover_url: 封面URL

### borrowings 表（借阅记录）
- id: 记录ID
- user_id: 用户ID
- book_id: 图书ID
- borrow_date: 借阅日期
- due_date: 应还日期
- return_date: 实际归还日期
- renew_count: 续借次数
- status: 状态（borrowed/returned/overdue）

## 业务规则

1. **借阅期限**: 默认借阅期限可设置（1-90天）
2. **续借次数**: 最多可续借2次，每次延长14天
3. **库存管理**: 借阅时自动减少可借数量，归还时自动增加
4. **权限控制**: 
   - 读者：浏览图书、借还图书、查看自己的借阅记录
   - 管理员：所有读者权限 + 图书管理 + 查看所有借阅记录

## 开发指南

### 后端开发

```bash
cd backend
go mod download
go run *.go
```

### 数据库迁移

数据库结构定义在 `init-db/schema.sql`，初始化由 `init-db/init.sh` 执行。

### 停止服务

```bash
docker-compose down
```

### 清理数据

```bash
docker-compose down -v
```

## License

MIT

## 作者

J132 openGauss RISC-V 实习生- zhuwei

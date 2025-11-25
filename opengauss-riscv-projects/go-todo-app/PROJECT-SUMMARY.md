# Go Todo 待办管理系统 - 项目总结文档

## 📋 项目概述

Go Todo 是一个基于 Go 语言开发的待办事项管理系统，使用 openGauss 6.0.0-riscv64 数据库，支持用户注册登录和独立的待办清单管理。项目采用前后端分离架构，完全容器化部署，适配 RISC-V 架构。

**项目特点：**
- ✅ 使用 openGauss 专用 Go 驱动（`gitee.com/opengauss/openGauss-connector-go-pq`）
- ✅ JWT 用户认证系统
- ✅ 每个用户独立的待办清单
- ✅ 优先级管理（低/中/高）
- ✅ 筛选和统计功能
- ✅ 完全容器化部署
- ✅ 适配 RISC-V 架构（SG2042 开发板）

---

## 🏗️ 项目架构

### 技术栈

**后端：**
- **语言**: Go 1.21
- **Web 框架**: Gin
- **ORM**: GORM
- **数据库驱动**: `gitee.com/opengauss/openGauss-connector-go-pq` (openGauss 专用)
- **认证**: JWT (golang-jwt/jwt/v5)
- **密码加密**: bcrypt

**前端：**
- **技术**: HTML5 + CSS3 + JavaScript (ES6+)
- **Web 服务器**: Nginx
- **UI**: 响应式设计，现代化界面

**数据库：**
- **数据库**: openGauss 6.0.0-riscv64
- **架构**: RISC-V 64-bit

**部署：**
- **容器化**: Docker + Docker Compose
- **基础镜像**: openeuler:24.03-riscv64

### 系统架构图

```
┌─────────────────────────────────────┐
│   前端容器 (Nginx + 静态文件)        │
│   - 端口: 8006                      │
│   - 路径: /go-todo                  │
└─────────────────────────────────────┘
              ↕ HTTP
┌─────────────────────────────────────┐
│   Go 后端 API (Gin)                │
│   - 端口: 8005                      │
│   - JWT 认证                        │
│   - RESTful API                     │
└─────────────────────────────────────┘
              ↕ SQL
┌─────────────────────────────────────┐
│   openGauss 数据库                  │
│   - 端口: 5432 (内部)               │
│   - 用户表 + 待办表                 │
└─────────────────────────────────────┘
```

---

## 📁 项目结构

```
go-todo-app/
├── backend/                    # Go 后端服务
│   ├── main.go                 # 主程序文件（包含所有 API）
│   ├── go.mod                  # Go 模块定义
│   ├── go.sum                  # 依赖锁定文件
│   └── Dockerfile              # 后端容器配置
│
├── frontend/                   # 前端静态文件
│   ├── index.html              # 主页面
│   ├── app.js                  # 前端逻辑（认证 + CRUD）
│   ├── style.css               # 样式文件
│   ├── nginx.conf              # Nginx 配置
│   └── Dockerfile              # 前端容器配置
│
├── init-db/                    # 数据库初始化
│   ├── schema.sql              # 数据库表结构
│   ├── init.sh                 # 初始化脚本
│   └── fix-auth.sh             # 认证修复脚本
│
├── docker-compose.yml          # Docker Compose 配置
├── .env.example                # 环境变量示例
└── PROJECT-SUMMARY.md          # 项目总结文档（本文件）
```

---

## 🔑 核心功能

### 1. 用户认证系统

**注册功能：**
- 用户名（3-50 字符）
- 邮箱地址（唯一）
- 密码（最少 6 位）
- 密码使用 bcrypt 加密存储

**登录功能：**
- 用户名 + 密码登录
- JWT Token 生成（7 天有效期）
- Token 自动存储到 localStorage

**安全特性：**
- 密码哈希存储（bcrypt）
- JWT Token 认证
- 用户数据隔离（数据库级外键约束）

### 2. 待办事项管理

**CRUD 操作：**
- ✅ 创建待办事项
- ✅ 查看待办列表（支持筛选）
- ✅ 更新待办状态和内容
- ✅ 删除单个待办
- ✅ 批量删除已完成待办

**功能特性：**
- 优先级设置（0-低, 1-中, 2-高）
- 描述信息（可选）
- 完成状态标记
- 创建时间记录

**筛选功能：**
- 全部待办
- 未完成待办
- 已完成待办
- 高优先级待办

**统计信息：**
- 总待办数
- 未完成数
- 已完成数

### 3. 用户数据隔离

- 每个用户只能看到自己的待办事项
- 数据库级外键约束确保数据完整性
- API 层面强制用户 ID 过滤

---

## 🗄️ 数据库设计

### 表结构

#### users 表（用户表）
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**索引：**
- `idx_users_username` - 用户名索引
- `idx_users_email` - 邮箱索引

#### todos 表（待办事项表）
```sql
CREATE TABLE todos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**索引：**
- `idx_todos_user_id` - 用户 ID 索引
- `idx_todos_completed` - 完成状态索引
- `idx_todos_priority` - 优先级索引
- `idx_todos_created_at` - 创建时间索引
- `idx_todos_user_completed` - 用户+完成状态复合索引

**外键约束：**
- `user_id` → `users(id)` ON DELETE CASCADE（级联删除）

---

## 🔌 API 接口文档

### 认证接口

#### 1. 用户注册
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
}

Response 201:
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com"
    }
}
```

#### 2. 用户登录
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
    "username": "testuser",
    "password": "password123"
}

Response 200:
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": 1,
        "username": "testuser",
        "email": "test@example.com"
    }
}
```

### 待办事项接口（需要认证）

所有待办接口都需要在请求头中携带 JWT Token：
```
Authorization: Bearer <token>
```

#### 3. 获取待办列表
```
GET /api/todos?completed=true&priority=2
Authorization: Bearer <token>

Response 200:
[
    {
        "id": 1,
        "user_id": 1,
        "title": "完成项目文档",
        "description": "编写项目总结文档",
        "completed": false,
        "priority": 2,
        "created_at": "2024-01-01T10:00:00Z",
        "updated_at": "2024-01-01T10:00:00Z"
    }
]
```

**查询参数：**
- `completed` (可选): `true`/`false` - 筛选完成状态
- `priority` (可选): `0`/`1`/`2` - 筛选优先级

#### 4. 获取单个待办
```
GET /api/todos/:id
Authorization: Bearer <token>

Response 200:
{
    "id": 1,
    "user_id": 1,
    "title": "完成项目文档",
    "description": "编写项目总结文档",
    "completed": false,
    "priority": 2,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
}
```

#### 5. 创建待办事项
```
POST /api/todos
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
    "title": "完成项目文档",
    "description": "编写项目总结文档",
    "priority": 2
}

Response 201:
{
    "id": 1,
    "user_id": 1,
    "title": "完成项目文档",
    "description": "编写项目总结文档",
    "completed": false,
    "priority": 2,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
}
```

#### 6. 更新待办事项
```
PUT /api/todos/:id
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
    "title": "更新后的标题",
    "completed": true,
    "priority": 1
}

Response 200:
{
    "id": 1,
    "user_id": 1,
    "title": "更新后的标题",
    "description": "编写项目总结文档",
    "completed": true,
    "priority": 1,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T11:00:00Z"
}
```

#### 7. 删除单个待办
```
DELETE /api/todos/:id
Authorization: Bearer <token>

Response 200:
{
    "message": "删除成功"
}
```

#### 8. 删除所有已完成待办
```
DELETE /api/todos
Authorization: Bearer <token>

Response 200:
{
    "message": "已删除所有完成的待办事项"
}
```

### 用户信息接口

#### 9. 获取当前用户信息
```
GET /api/user/me
Authorization: Bearer <token>

Response 200:
{
    "id": 1,
    "username": "testuser",
    "email": "test@example.com"
}
```

### 健康检查接口

#### 10. 健康检查
```
GET /health
GET /api/todos/health

Response 200:
{
    "status": "ok",
    "timestamp": "2024-01-01T10:00:00Z",
    "service": "go-todo-api",
    "database": "openGauss"
}
```

---

## 🚀 部署指南

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- SG2042 开发板（RISC-V 架构）或支持 RISC-V 容器的环境

### 部署步骤

#### 1. 克隆项目
```bash
cd opengauss-riscv-projects
cd go-todo-app
```

#### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，设置数据库用户名、密码和 JWT 密钥
```

`.env` 文件内容：
```env
DB_NAME=tododb
DB_USERNAME=todo
DB_PASSWORD=TodoPass2024
JWT_SECRET=your-secret-key-change-in-production
```

#### 3. 构建并启动服务
```bash
docker-compose up -d --build
```

#### 4. 查看服务状态
```bash
docker-compose ps
```

#### 5. 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f todo-backend
docker-compose logs -f todo-frontend
```

#### 6. 访问应用
- **前端**: http://localhost:8006
- **后端 API**: http://localhost:8005
- **健康检查**: http://localhost:8005/health

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 8006 | Nginx 静态文件服务 |
| 后端 API | 8005 | Gin HTTP 服务 |
| 数据库 | 5432 | openGauss（仅内部访问） |

---

## 🔧 开发指南

### 本地开发（后端）

#### 1. 安装 Go 依赖
```bash
cd backend
go mod download
```

#### 2. 配置环境变量
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=todo
export DB_PASSWORD=TodoPass2024
export DB_NAME=tododb
export DB_SSLMODE=disable
export PORT=8005
export JWT_SECRET=dev-secret-key
```

#### 3. 运行后端服务
```bash
go run main.go
```

### 本地开发（前端）

#### 1. 使用 Nginx 或简单 HTTP 服务器
```bash
cd frontend
# 使用 Python 简单服务器
python3 -m http.server 8080

# 或使用 Node.js http-server
npx http-server -p 8080
```

#### 2. 修改 API 地址
在 `index.html` 中修改：
```javascript
window.__API_BASE__ = "http://localhost:8005/api/todos";
window.__AUTH_BASE__ = "http://localhost:8005/api/auth";
```

### 构建 Docker 镜像

#### 后端镜像
```bash
cd backend
docker build -t go-todo-backend:latest .
```

#### 前端镜像
```bash
cd frontend
docker build -t go-todo-frontend:latest .
```

---

## 🔐 安全特性

### 1. 密码安全
- 使用 bcrypt 算法加密密码
- 密码不存储在明文
- 密码最小长度 6 位

### 2. 认证安全
- JWT Token 7 天过期
- Token 存储在客户端 localStorage
- 所有 API 请求验证 Token

### 3. 数据安全
- 用户数据隔离（数据库级约束）
- SQL 注入防护（GORM 参数化查询）
- CORS 配置（生产环境应限制域名）

### 4. 数据库安全
- 使用 openGauss 专用驱动（支持 SHA256）
- 连接字符串不暴露敏感信息
- 数据库连接池限制

---

## 📊 性能优化

### 1. 数据库优化
- 关键字段建立索引
- 用户 ID + 完成状态复合索引
- 连接池配置（最大 25 连接，空闲 5 连接）

### 2. API 优化
- 查询结果按创建时间倒序
- 支持筛选减少数据传输
- 健康检查端点快速响应

### 3. 前端优化
- 静态资源缓存
- 本地存储 Token（减少请求）
- 30 秒轮询检查 API 状态

---

## 🐛 故障排查

### 1. 数据库连接失败

**问题**: `数据库连接失败: connection refused`

**解决方案**:
```bash
# 检查数据库容器状态
docker-compose ps database

# 查看数据库日志
docker-compose logs database

# 检查数据库健康状态
docker exec og-todo-db gsql -d postgres -c "SELECT 1;"
```

### 2. JWT Token 无效

**问题**: `无效的令牌`

**解决方案**:
- 检查 JWT_SECRET 环境变量是否一致
- Token 可能已过期（7 天），重新登录
- 清除浏览器 localStorage 重新登录

### 3. 用户注册失败

**问题**: `用户名或邮箱已存在`

**解决方案**:
- 使用不同的用户名或邮箱
- 检查数据库中是否已有该用户

### 4. 待办事项无法创建

**问题**: `待办事项不存在` 或 `缺少认证令牌`

**解决方案**:
- 检查是否已登录（Token 是否有效）
- 检查请求头是否包含 `Authorization: Bearer <token>`
- 查看后端日志确认错误信息

---

## 🔄 集成到展示中心

### 1. 更新 Nginx 网关配置

在 `nginx-gateway/nginx.conf` 中添加：

```nginx
# Go Todo 前端和 API upstream
upstream go-todo-frontend {
    server 127.0.0.1:8006 max_fails=3 fail_timeout=30s;
}

upstream go-todo-backend {
    server 127.0.0.1:8005 max_fails=3 fail_timeout=30s;
}

# Go Todo API（包括认证）
location /go-todo/api/ {
    proxy_pass http://go-todo-backend/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With" always;
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}

# Go Todo 前端
location /go-todo {
    if ($uri = /go-todo) {
        return 301 /go-todo/;
    }
    rewrite ^/go-todo(/.*)$ $1 break;
    rewrite ^/go-todo$ / break;
    proxy_pass http://go-todo-frontend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 2. 更新展示网站配置

在 `showcase/app.js` 的 `apps` 数组中添加：

```javascript
{
    id: 'go-todo',
    name: 'Go Todo 待办管理',
    icon: '📝',
    description: '基于 Go + Gin + GORM 的待办事项管理系统，展示 Go 语言与 openGauss 的集成。支持用户注册登录、优先级管理、筛选统计等功能。',
    tech: ['Go', 'Gin', 'GORM', 'openGauss', 'RISC-V'],
    path: '/go-todo',
    apiPath: '/go-todo/api',
    status: 'checking'
}
```

### 3. 配置 frp（如果使用内网穿透）

在 SG2042 的 `frpc.ini` 中添加：

```ini
[go-todo-frontend]
type = tcp
local_ip = 127.0.0.1
local_port = 8006
remote_port = 8006

[go-todo-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 8005
remote_port = 8005
```

---

## 📝 技术亮点

### 1. openGauss 专用驱动
- 使用 `gitee.com/opengauss/openGauss-connector-go-pq`
- 支持 SHA256/SM3 密码认证
- 完全兼容 openGauss 特性

### 2. JWT 认证系统
- 无状态认证
- Token 自动过期
- 前端自动管理 Token

### 3. 用户数据隔离
- 数据库级外键约束
- API 层面强制过滤
- 确保数据安全

### 4. 现代化前端
- 响应式设计
- 模态框登录/注册
- 实时状态更新

### 5. 容器化部署
- 完全 Docker 化
- 健康检查机制
- 服务依赖管理

---

## 🎯 项目特色

1. **首个 Go + openGauss RISC-V 应用**: 展示 Go 语言在 RISC-V 架构上的应用
2. **专用驱动支持**: 使用 openGauss 官方 Go 驱动
3. **完整认证系统**: JWT + bcrypt 密码加密
4. **用户隔离**: 每个用户独立的待办清单
5. **现代化 UI**: 美观的界面设计
6. **易于部署**: 一键 Docker Compose 部署

---

## 📚 相关资源

- [openGauss 官方文档](https://docs.opengauss.org/)
- [openGauss Go 驱动](https://gitee.com/opengauss/openGauss-connector-go-pq)
- [GORM 文档](https://gorm.io/docs/)

---

## 📄 许可证

本项目采用 MIT 许可证。

---

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

---

**Go Todo 待办管理系统** - 基于 Go + openGauss + RISC-V 的现代化待办应用 🚀

## 作者

J132 openGauss RISC-V 实习生- zhuwei

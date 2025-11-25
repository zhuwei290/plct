# openGauss RISC-V 应用展示中心

🚀 一个展示基于 **openGauss 6.0.0-riscv64** 数据库和 **RISC-V 架构** (SG2042) 的全栈应用集合。包含 6 个完整的应用案例，涵盖 Java、Go、Python 等多种技术栈。

[![openGauss](https://img.shields.io/badge/openGauss-6.0.0--riscv64-blue)](https://opengauss.org/)
[![RISC-V](https://img.shields.io/badge/RISC--V-SG2042-green)](https://www.sophgo.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://www.docker.com/)

## 📚 应用列表

| 应用 | 技术栈 | 端口 | 状态 | 说明 |
|------|--------|------|------|------|
| 🗨️ **留言板系统** | Python + Flask + PostgreSQL | 8001 | ✅ | 简单的留言板应用 |
| 🏥 **宠物诊疗系统** | Java + Spring Boot + MyBatis | 8002 | ✅ | Spring PetClinic 改造版 |
| 🎮 **2048 游戏** | JavaScript + Python + Flask | 8003 | ✅ | 经典 2048 游戏 + 排行榜 |
| 📚 **图书管理系统** | Go + Gin + GORM | 8004 | ✅ | 图书借阅管理系统 |
| 📝 **待办事项管理** | Go + Gin + GORM + JWT | 8005/8006 | ✅ | 用户待办清单应用 |
| 🛍️ **在线商城系统** | Java + Spring Boot + MyBatis | 8007/8008 | ✅ | 完整的电商系统 |

## 🏗️ 项目结构

```
opengauss-riscv-projects/
├── showcase/                          # 🎨 展示网站（应用中心）
│   ├── index.html                    # 主页面
│   ├── style.css                     # 样式文件
│   ├── app.js                        # 前端逻辑
│   └── Dockerfile                    # 容器配置
│
├── nginx-gateway/                     # 🌐 Nginx 反向代理网关
│   ├── nginx.conf                    # 统一路由配置
│   └── Dockerfile                    # 网关容器配置
│
├── opengauss-riscv-messageboard/     # 🗨️ 留言板系统
│   ├── backend/                      # Python Flask 后端
│   ├── frontend/                     # HTML/CSS/JS 前端
│   ├── init-db/                      # 数据库初始化
│   └── docker-compose.yml            # 端口: 8001
│
├── spring-petclinic-compose/         # 🏥 宠物诊疗系统
│   ├── backend/                      # Java Spring Boot 后端
│   ├── frontend/                     # React 前端
│   ├── init-db/                      # 数据库初始化
│   └── docker-compose.yml            # 端口: 8002
│
├── 2048-challenge/                    # 🎮 2048 游戏
│   ├── backend/                      # Python Flask 后端
│   ├── frontend/                     # HTML/CSS/JS 前端
│   ├── init-db/                      # 数据库初始化
│   └── docker-compose.yml            # 端口: 8003
│
├── go-library/                        # 📚 图书管理系统
│   ├── backend/                      # Go Gin 后端
│   ├── frontend/                     # HTML/CSS/JS 前端
│   ├── init-db/                      # 数据库初始化
│   └── docker-compose.yml            # 端口: 8004
│
├── go-todo-app/                       # 📝 待办事项管理
│   ├── backend/                      # Go Gin + JWT 后端
│   ├── frontend/                     # HTML/CSS/JS 前端
│   ├── init-db/                      # 数据库初始化
│   ├── docker-compose.yml            # 端口: 8005/8006
│   └── PROJECT-SUMMARY.md            # 项目详细文档
│
├── java-shop/                         # 🛍️ 在线商城系统
│   ├── backend/                      # Java Spring Boot 后端
│   ├── frontend/                     # HTML/CSS/JS 前端
│   ├── init-db/                      # 数据库初始化
│   └── docker-compose.yml            # 端口: 8007/8008
│
├── docker-compose.showcase.yml        # 展示网站部署配置
├── DEPLOY.md                          # 📖 详细部署文档
└── 常见错误处理.txt                    # 🔧 故障排查指南
```

## 🚀 快速开始

### 前置要求

- **硬件**: SG2042 RISC-V 开发板（推荐 16GB+ RAM）
- **软件**: 
  - Docker 20.10+
  - Docker Compose 2.0+
  - Git

### 在 SG2042 上部署应用

```bash
# 克隆项目
cd /path/to/your/workspace
git clone https://github.com/zhuwei290/plct.git
cd opengauss-riscv-projects

# 1. 部署留言板系统
cd opengauss-riscv-messageboard
docker-compose up -d --build

# 2. 部署宠物诊疗系统
cd ../spring-petclinic-compose
docker-compose up -d --build

# 3. 部署 2048 游戏
cd ../2048-challenge
docker-compose up -d --build

# 4. 部署图书管理系统
cd ../go-library
docker-compose up -d --build

# 5. 部署待办事项管理
cd ../go-todo-app
docker-compose up -d --build

# 6. 部署在线商城系统
cd ../java-shop
docker-compose up -d --build

# 查看所有服务状态
docker ps
```

### 在云服务器上部署展示网站

```bash
# 1. 克隆项目
git clone https://github.com/zhuwei290/plct.git
cd plct

# 2. 配置 Nginx 网关
# 编辑 nginx-gateway/nginx.conf
# - 如果 SG2042 有公网 IP，修改 upstream 中的 IP 地址
# - 如果使用内网穿透 (frp)，配置为 127.0.0.1:端口

# 3. 启动展示网站和网关
docker-compose -f docker-compose.showcase.yml up -d --build

# 4. 访问展示中心
# http://your-server-ip
```

### 使用 frp 内网穿透（可选）

如果 SG2042 在内网，需要使用 frp 进行内网穿透：

```bash
# 在云服务器上启动 frps
# 参考 DEPLOY.md 中的 frp 配置

# 在 SG2042 上启动 frpc
# 转发所有应用端口 (8001-8008)
```

## ✨ 功能特性

### 展示中心特性
- 🎨 **现代化 UI** - 美观的卡片式布局，响应式设计
- 🔍 **实时监控** - 自动检测应用在线状态（每 30 秒）
- 🔄 **统一入口** - 通过 Nginx 网关统一访问所有应用
- � **状态展示** - 显示应用运行状态和技术栈
- 🌐 **一键访问** - 点击卡片直接跳转到应用

### 技术特性
- �🐳 **完全容器化** - 所有服务使用 Docker Compose 部署
- 🏗️ **微服务架构** - 每个应用独立数据库和服务
- 🔐 **安全隔离** - 数据库网络隔离，不对外暴露
- 📦 **易于扩展** - 添加新应用只需修改配置文件
- 🌐 **内网穿透支持** - 支持 frp 等内网穿透方案

### 应用特性
- **多语言支持**: Java、Go、Python
- **多框架支持**: Spring Boot、Gin、Flask
- **认证系统**: JWT、Session、Cookie
- **前后端分离**: RESTful API + 现代化前端
- **RISC-V 原生**: 所有应用在 RISC-V 架构上原生运行

## 🎯 应用详情

### 🗨️ 留言板系统
- **端口**: 8001
- **技术**: Python + Flask + PostgreSQL
- **功能**: 简单的留言板，支持发布和查看留言

### 🏥 宠物诊疗系统
- **端口**: 8002
- **技术**: Java + Spring Boot + MyBatis + React
- **功能**: Spring PetClinic 改造版，支持宠物管理、医生管理、预约等

### 🎮 2048 游戏
- **端口**: 8003
- **技术**: JavaScript + Python + Flask
- **功能**: 经典 2048 游戏 + 排行榜系统

### 📚 图书管理系统
- **端口**: 8004
- **技术**: Go + Gin + GORM
- **功能**: 图书借阅管理，支持图书 CRUD、借阅记录

### 📝 待办事项管理
- **端口**: 8005 (后端) / 8006 (前端)
- **技术**: Go + Gin + GORM + JWT
- **功能**: 用户认证、待办清单、优先级管理、筛选统计
- **详情**: 查看 [PROJECT-SUMMARY.md](./go-todo-app/PROJECT-SUMMARY.md)

### 🛍️ 在线商城系统
- **端口**: 8007 (后端) / 8008 (前端)
- **技术**: Java + Spring Boot + MyBatis
- **功能**: 完整电商系统，用户注册登录、商品管理、购物车、订单管理

## 📖 详细文档

- **部署指南**: [DEPLOY.md](./DEPLOY.md) - 完整的部署步骤和配置说明
- **故障排查**: [常见错误处理.txt](./常见错误处理.txt) - 常见问题和解决方案
- **应用文档**: 各应用目录下的 README.md

## 🔧 故障排查

常见问题：

1. **数据库连接失败**: 检查 openGauss 容器状态，确认密码加密类型为 MD5
2. **端口冲突**: 确认端口 8001-8008 没有被占用
3. **容器启动失败**: 查看日志 `docker-compose logs -f [service-name]`
4. **API 无法访问**: 检查 Nginx 配置和防火墙设置

详细排查步骤请查看 `常见错误处理.txt`。

## 📊 系统要求

### SG2042 开发板
- **CPU**: 64-core RISC-V
- **内存**: 16GB+ 推荐
- **存储**: 100GB+ 可用空间
- **系统**: openEuler 24.03-riscv64 或兼容系统

### 云服务器（展示网站）
- **CPU**: 2 核+
- **内存**: 2GB+
- **系统**: Ubuntu 20.04+ / CentOS 7+ 或兼容系统

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

本项目采用 MIT 许可证。

## 👤 作者

**J132 openGauss RISC-V 实习生 - zhuwei**

- GitHub: [@zhuwei290](https://github.com/zhuwei290)
- Email: 2903293094@qq.com

## 🙏 致谢

- [openGauss](https://opengauss.org/) - 开源数据库
- [PLCT Lab](https://plctlab.org/) - RISC-V 生态支持
- [Sophgo](https://www.sophgo.com/) - SG2042 开发板

---

**openGauss RISC-V 应用展示中心** - 展示 openGauss 在 RISC-V 架构上的强大能力 🚀


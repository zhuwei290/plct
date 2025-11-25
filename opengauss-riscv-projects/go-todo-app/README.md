# Go Todo 待办管理系统

基于 Go + Gin + openGauss 的待办事项管理系统，支持用户注册登录和独立的待办清单。

## 快速开始

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# 前端: http://localhost:8006
# API: http://localhost:8005
```

## 技术栈

- **后端**: Go 1.21 + Gin + GORM
- **数据库**: openGauss 6.0.0-riscv64
- **驱动**: gitee.com/opengauss/openGauss-connector-go-pq
- **前端**: HTML/CSS/JavaScript
- **部署**: Docker Compose

## 功能特性

- ✅ 用户注册/登录（JWT 认证）
- ✅ 每个用户独立的待办清单
- ✅ 优先级管理（低/中/高）
- ✅ 筛选功能（全部/未完成/已完成/高优先级）
- ✅ 统计信息
- ✅ 响应式设计

## 详细文档

请查看 [PROJECT-SUMMARY.md](./PROJECT-SUMMARY.md) 获取完整的项目文档。

## 端口

- 前端: 8006
- 后端: 8005
- 数据库: 5432 (内部)


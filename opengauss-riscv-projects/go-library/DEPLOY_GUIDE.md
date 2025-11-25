# Go Library 图书管理系统部署指南

## 🚀 快速部署（SG2042 RISC-V）

### 1. 进入项目目录

```bash
cd /path/to/opengauss-riscv-projects/go-library
```

### 2. 运行启动脚本

```bash
chmod +x start-app.sh
./start-app.sh
```

脚本会自动：
- ✅ 创建 .env 配置文件
- ✅ 生成前端 CSS 和 JavaScript 文件
- ✅ 启动 openGauss 数据库
- ✅ 初始化数据库表结构
- ✅ 启动后端 API 服务
- ✅ 启动前端 Nginx 服务

### 3. 验证服务

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试健康检查
curl http://localhost:8007/health
curl http://localhost:8008/health
```

### 4. 访问系统

**本地访问（SG2042）：**
- 前端页面: http://localhost:8008
- 后端 API: http://localhost:8007
- API 文档: http://localhost:8007/health

**通过网关访问（推荐）：**
- 完整地址: http://your-domain/go-library
- API 地址: http://your-domain/go-library/api

## 🔧 集成到 Showcase

### 1. 更新 Showcase（已完成）

`showcase/app.js` 已添加 Go Library 配置：

```javascript
{
    id: 'go-library',
    name: 'Go 图书管理',
    icon: '📚',
    description: '基于 Go + Gin + openGauss 的图书借阅管理系统...',
    path: '/go-library',
    apiPath: '/go-library/api'
}
```

### 2. 更新 Nginx 网关（已完成）

`nginx-gateway/nginx.conf` 已添加路由配置：
- `/go-library/api/` -> 后端 API（端口 8007）
- `/go-library` -> 前端（端口 8008）

### 3. 更新 FRP 配置（已完成）

`DEPLOY.md` 中 FRP 配置已添加：

```ini
[go-library-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 8007
remote_port = 8007

[go-library-frontend]
type = tcp
local_ip = 127.0.0.1
local_port = 8008
remote_port = 8008
```

### 4. 重启服务

**在 SG2042 上：**
```bash
# 重启 Go Library
cd /path/to/opengauss-riscv-projects/go-library
docker-compose restart

# 重启 FRP（如果使用）
systemctl restart frpc
```

**在腾讯云上：**
```bash
# 重建 Showcase（包含新应用）
cd /path/to/opengauss-riscv-projects
docker-compose -f docker-compose.showcase.yml build showcase
docker-compose -f docker-compose.showcase.yml up -d showcase

# 重启 Nginx 网关（加载新配置）
docker-compose -f docker-compose.showcase.yml restart nginx-gateway
```

## 📊 使用指南

### 首次使用

1. **注册账号**
   - 首个注册用户自动设为管理员
   - 后续用户为普通读者

2. **管理员功能**
   - 添加图书分类
   - 添加/编辑/删除图书
   - 查看所有借阅记录
   - 管理图书库存

3. **读者功能**
   - 浏览图书列表
   - 搜索图书（书名/作者/ISBN）
   - 借阅图书（设置天数）
   - 归还图书
   - 续借图书（最多2次）
   - 查看借阅历史

### 借阅规则

- **借阅期限**: 1-90天（可自定义）
- **续借次数**: 最多2次，每次延长14天
- **库存管理**: 自动更新可借数量
- **逾期检测**: 系统自动标记逾期记录

## 🗄️ 数据库管理

### 连接数据库

```bash
# 进入数据库容器
docker exec -it og-library-db bash

# 连接数据库
su - omm
gsql -d librarydb -U library -W LibraryPass2024
```

### 常用查询

```sql
-- 查看所有图书
SELECT * FROM books;

-- 查看借阅统计
SELECT 
    COUNT(*) as total_borrowings,
    SUM(CASE WHEN status='borrowed' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END) as returned
FROM borrowings;

-- 查看热门图书
SELECT b.title, b.author, COUNT(*) as borrow_count
FROM borrowings br
JOIN books b ON br.book_id = b.id
GROUP BY b.id, b.title, b.author
ORDER BY borrow_count DESC
LIMIT 10;
```

### 备份数据库

```bash
# 导出数据
docker exec og-library-db su - omm -c \
  "gs_dump -U library -d librarydb -f /tmp/library_backup.sql"

# 复制到宿主机
docker cp og-library-db:/tmp/library_backup.sql ./backup/

# 恢复数据
docker cp ./backup/library_backup.sql og-library-db:/tmp/
docker exec og-library-db su - omm -c \
  "gsql -U library -d librarydb -f /tmp/library_backup.sql"
```

## 🐛 故障排查

### 后端无法连接数据库

```bash
# 检查数据库状态
docker logs og-library-db

# 检查认证配置
docker exec og-library-db su - omm -c \
  "gsql -d postgres -c 'SHOW password_encryption_type;'"

# 应该显示 md5
```

### 前端 API 调用失败

```bash
# 检查后端日志
docker logs og-library-backend

# 检查网关路由
curl -v http://localhost/go-library/api/health

# 检查 CORS 配置
curl -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS http://localhost/go-library/api/auth/login
```

### 清除数据重新开始

```bash
# 停止服务
docker-compose down

# 删除数据卷
docker volume rm go-library_pgdata

# 重新启动
./start-app.sh
```

## 📈 性能优化

### 数据库优化

```sql
-- 创建额外索引
CREATE INDEX idx_books_title_author ON books(title, author);
CREATE INDEX idx_borrowings_dates ON borrowings(borrow_date, due_date);

-- 定期清理统计
VACUUM ANALYZE books;
VACUUM ANALYZE borrowings;
```

### 容器资源限制

编辑 `docker-compose.yml`:

```yaml
services:
  library-backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

## 🔒 安全建议

1. **修改默认密码**: 编辑 `.env` 文件，修改数据库密码和 JWT 密钥
2. **启用HTTPS**: 在网关层配置 SSL 证书
3. **限制访问**: 使用防火墙规则限制数据库端口访问
4. **定期备份**: 设置定时任务定期备份数据库
5. **日志监控**: 定期检查日志，发现异常访问

## 📞 技术支持

- 项目地址: https://github.com/zhuwei290/plct/tree/main
- 问题反馈: 提交 GitHub Issue
- 邮件联系: 2903293094@qq.com

## 📝 更新日志

### v1.0.0 (2025-11-17)
- ✅ 初始版本
- ✅ 完整的图书管理功能
- ✅ 借阅管理系统
- ✅ 用户角色权限
- ✅ 统计报表功能
- ✅ 集成到 Showcase

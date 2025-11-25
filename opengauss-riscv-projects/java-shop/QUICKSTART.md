# Java Shop 快速开始

## 一键启动

```bash
cd java-shop
chmod +x start-app.sh
./start-app.sh
```

## 访问地址

- **前端**: http://localhost:8010
- **后端 API**: http://localhost:8009/api/health

## 默认账号

第一个注册的用户自动成为管理员。

建议首次注册：
- 用户名: admin
- 密码: Admin@123
- 邮箱: admin@shop.com

## 功能演示

### 1. 注册/登录
- 打开前端页面
- 点击"立即注册"
- 填写信息并注册
- 自动登录

### 2. 浏览商品
- 查看商品列表
- 搜索商品
- 按分类筛选
- 查看商品详情

### 3. 购物流程
1. 点击"加入购物车"
2. 进入"购物车"标签页
3. 调整商品数量
4. 点击"去结算"
5. 填写收货信息
6. 提交订单

### 4. 订单管理
- 进入"我的订单"标签页
- 查看订单列表
- 查看订单详情

### 5. 商品管理（管理员）
- 进入"商品管理"标签页
- 点击"+ 添加商品"
- 填写商品信息
- 保存

## 故障排查

### 后端无法启动

```bash
# 查看日志
docker-compose logs shop-backend

# 重新构建
docker-compose build --no-cache shop-backend
docker-compose up -d shop-backend
```

### 数据库连接失败

```bash
# 检查数据库状态
docker-compose ps

# 查看数据库日志
docker-compose logs database

# 重新初始化
docker-compose down -v
./start-app.sh
```

### 前端空白

```bash
# 重启前端
docker-compose restart shop-frontend

# 查看前端日志
docker-compose logs shop-frontend

# 清除浏览器缓存
# Ctrl+Shift+R 强制刷新
```

## 停止服务

```bash
docker-compose down

# 删除数据（谨慎）
docker-compose down -v
```

## 开发模式

### 后端开发

```bash
cd backend

# 编译
mvn clean package

# 运行
java -jar target/*.jar

# 或使用 IDE 直接运行 ShopApplication
```

### 前端开发

```bash
cd frontend

# 修改 index.html、style.css、app.js

# 重启前端容器
docker-compose restart shop-frontend
```

## 数据库操作

```bash
# 连接数据库
docker exec -it og-shop-db gsql -d shopdb -U shopuser

# 查看所有表
\dt

# 查看商品
SELECT * FROM products;

# 查看订单
SELECT * FROM orders;

# 退出
\q
```

## API 测试

```bash
# 健康检查
curl http://localhost:8009/api/health

# 注册用户
curl -X POST http://localhost:8009/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456","email":"test@test.com"}'

# 登录
curl -X POST http://localhost:8009/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'

# 获取商品列表（需要 token）
curl http://localhost:8009/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 性能优化建议

1. **生产环境配置**
   - 修改 JWT 密钥
   - 使用强密码
   - 启用 HTTPS

2. **数据库优化**
   - 适当增加连接池大小
   - 为热点查询添加索引
   - 定期清理过期数据

3. **应用优化**
   - 启用 Redis 缓存
   - 使用 CDN 加速静态资源
   - 配置负载均衡

## 常见问题

**Q: 如何修改端口？**

A: 编辑 `.env` 文件中的 `SERVER_PORT`，同时修改 `docker-compose.yml` 中的端口映射。

**Q: 如何添加新的商品分类？**

A: 直接在数据库中插入或通过 API 添加（需要管理员权限）。

**Q: 支付功能如何实现？**

A: 当前版本仅模拟支付流程，实际生产环境需要集成支付网关（如支付宝、微信支付）。

**Q: 如何部署到生产环境？**

A: 参考 `README.md` 中的"性能优化"和"安全建议"章节，配置 HTTPS、修改默认密码、启用防火墙等。

## 更多信息

- 详细文档: `README.md`
- API 文档: 见 `README.md` 中的 API 章节
- 部署指南: `../DEPLOY.md`

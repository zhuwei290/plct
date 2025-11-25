# Nginx 网关

这是 openGauss RISC-V 应用展示中心的统一网关服务，负责将所有应用请求路由到相应的后端服务。

## 🌟 功能特性

- 🔄 **反向代理** - 统一入口访问所有应用
- ⚡ **负载均衡** - 支持上游服务器故障转移
- 🗜️ **Gzip 压缩** - 减少传输数据量
- 📊 **健康检查** - 自动检测后端服务状态
- 🔒 **SSL/TLS 支持** - HTTPS 加密传输
- 🚀 **HTTP/2** - 更快的页面加载速度

## 📁 文件说明

```
nginx-gateway/
├── nginx.conf              # 标准 HTTP 配置
├── nginx-ssl.conf          # HTTPS 配置模板
├── Dockerfile              # Nginx 容器配置
├── docker-compose.yml      # 标准部署配置
├── docker-compose-ssl.yml  # SSL 部署配置
├── setup-ssl.sh            # SSL 自动配置脚本
├── SSL-SETUP-GUIDE.md      # SSL 详细配置指南
├── ssl-quick-reference.txt # SSL 快速参考
└── README.md               # 本文件
```

## 🚀 快速开始

### 标准 HTTP 部署

```bash
# 1. 进入目录
cd nginx-gateway

# 2. 启动服务
docker-compose up -d --build

# 3. 查看状态
docker-compose ps

# 4. 查看日志
docker-compose logs -f
```

### HTTPS 部署（推荐）

```bash
# 1. 进入目录
cd nginx-gateway

# 2. 运行 SSL 配置脚本
chmod +x setup-ssl.sh
sudo ./setup-ssl.sh

# 按提示输入:
# - 域名（例如: example.com）
# - 邮箱（用于证书通知）

# 3. 启动 SSL 服务
docker-compose -f docker-compose-ssl.yml up -d --build

# 4. 访问
# https://your-domain.com
```

详细配置步骤请参考: [SSL-SETUP-GUIDE.md](./SSL-SETUP-GUIDE.md)

## 🔧 配置说明

### 路由规则

| 路径 | 后端服务 | 端口 | 说明 |
|------|---------|------|------|
| `/` | showcase | 9966 | 展示中心首页 |
| `/messageboard` | messageboard | 8001 | 留言板应用 |
| `/petclinic` | petclinic | 8002 | 宠物诊疗系统 |
| `/2048` | game2048 | 8003 | 2048 游戏 |
| `/go-library` | go-library-frontend | 8004 | 图书管理系统 |
| `/go-todo` | go-todo-frontend | 8006 | 待办事项管理（前端） |
| `/go-todo/api` | go-todo-backend | 8005 | 待办事项管理（API） |
| `/java-shop` | java-shop-frontend | 8008 | 在线商城（前端） |
| `/java-shop/api` | java-shop-backend | 8007 | 在线商城（API） |

### 上游服务器配置

```nginx
upstream showcase {
    server 127.0.0.1:9966 max_fails=3 fail_timeout=30s;
}

upstream messageboard {
    server 127.0.0.1:8001 max_fails=3 fail_timeout=30s;
}

# ... 其他服务
```

**参数说明**:
- `max_fails=3`: 最大失败次数
- `fail_timeout=30s`: 失败超时时间

### Gzip 压缩配置

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

## 🔒 SSL 证书

### Let's Encrypt 免费证书（推荐）

使用自动配置脚本:

```bash
sudo ./setup-ssl.sh
```

脚本会自动:
1. 安装 Certbot
2. 获取 SSL 证书
3. 配置 Nginx
4. 设置自动续期

### 使用自己的证书

1. 将证书文件上传到服务器
2. 编辑 `nginx-ssl.conf`:

```nginx
ssl_certificate /path/to/your/certificate.crt;
ssl_certificate_key /path/to/your/private.key;
```

3. 更新 Docker Compose 挂载:

```yaml
volumes:
  - /path/to/your/certs:/etc/nginx/certs:ro
```

## 📊 监控和日志

### 查看日志

```bash
# 实时日志
docker-compose logs -f nginx-gateway

# 访问日志
tail -f logs/access.log

# 错误日志
tail -f logs/error.log
```

### 健康检查

```bash
# 检查 Nginx 配置
docker exec nginx-gateway nginx -t

# 查看服务状态
docker-compose ps

# 测试网关
curl -I http://localhost
```

## 🔧 故障排查

### 1. Nginx 启动失败

```bash
# 检查配置语法
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t

# 查看错误日志
docker-compose logs nginx-gateway

# 检查端口占用
sudo netstat -tlnp | grep ':80\|:443'
```

### 2. 后端服务无法访问

```bash
# 检查上游服务状态
docker ps

# 测试上游服务
curl http://localhost:8001
curl http://localhost:8002

# 查看 Nginx 错误日志
tail -f logs/error.log
```

### 3. SSL 证书问题

```bash
# 检查证书文件
ls -l /etc/letsencrypt/live/your-domain.com/

# 测试证书
openssl s_client -connect your-domain.com:443

# 查看证书信息
sudo certbot certificates
```

## 🔄 更新配置

### 修改路由规则

1. 编辑 `nginx.conf` 或 `nginx-ssl.conf`
2. 测试配置:
   ```bash
   docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
   ```
3. 重启服务:
   ```bash
   docker-compose restart nginx-gateway
   ```

### 添加新应用

1. 在配置文件中添加 upstream:
   ```nginx
   upstream new-app {
       server 127.0.0.1:8010 max_fails=3 fail_timeout=30s;
   }
   ```

2. 添加 location 规则:
   ```nginx
   location /new-app {
       proxy_pass http://new-app/;
       # ... 其他配置
   }
   ```

3. 重启服务

## 📚 参考文档

- **SSL 配置**: [SSL-SETUP-GUIDE.md](./SSL-SETUP-GUIDE.md)
- **快速参考**: [ssl-quick-reference.txt](./ssl-quick-reference.txt)
- **部署指南**: [../DEPLOY.md](../DEPLOY.md)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)

## 🤝 技术支持

如有问题，请参考:
- GitHub Issues: [https://github.com/zhuwei290/plct/issues](https://github.com/zhuwei290/plct/issues)
- 邮箱: 2903293094@qq.com

---

**Nginx 网关 - openGauss RISC-V 应用展示中心的流量枢纽** 🌐

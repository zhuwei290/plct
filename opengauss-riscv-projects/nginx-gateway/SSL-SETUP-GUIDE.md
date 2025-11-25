# SSL 证书配置指南

本指南将帮助你为 openGauss RISC-V 应用展示中心配置 SSL 证书，实现 HTTPS 访问。

## 📋 目录

1. [前置要求](#前置要求)
2. [方案一：自动配置（推荐）](#方案一自动配置推荐)
3. [方案二：手动配置](#方案二手动配置)
4. [证书续期](#证书续期)
5. [故障排查](#故障排查)

---

## 前置要求

### 必需条件
- ✅ 一个已注册的域名（例如: `example.com`）
- ✅ 域名已解析到你的服务器 IP
- ✅ 服务器开放 80 和 443 端口
- ✅ Root 权限

### 验证域名解析
```bash
# 检查域名是否正确解析
ping your-domain.com
nslookup your-domain.com

# 检查端口是否开放
sudo netstat -tlnp | grep ':80\|:443'
```

---

## 方案一：自动配置（推荐）

使用 Let's Encrypt 提供的免费 SSL 证书，自动配置脚本会处理所有步骤。

### 步骤 1: 准备工作

```bash
# 进入 nginx-gateway 目录
cd /path/to/opengauss-riscv-projects/nginx-gateway

# 给脚本添加执行权限
chmod +x setup-ssl.sh
```

### 步骤 2: 运行自动配置脚本

```bash
# 使用 root 权限运行
sudo ./setup-ssl.sh
```

脚本会提示你输入：
- **域名**: 例如 `example.com`（会自动包含 `www.example.com`）
- **邮箱**: 用于接收证书到期提醒

### 步骤 3: 重新部署 Nginx

```bash
# 使用 SSL 配置启动
docker-compose -f docker-compose-ssl.yml build
docker-compose -f docker-compose-ssl.yml up -d

# 查看日志
docker-compose -f docker-compose-ssl.yml logs -f nginx-gateway
```

### 步骤 4: 验证 HTTPS

```bash
# 测试 HTTPS 访问
curl -I https://your-domain.com

# 检查证书信息
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

访问: `https://your-domain.com` 查看是否显示安全锁图标 🔒

---

## 方案二：手动配置

如果自动脚本无法使用，可以按照以下步骤手动配置。

### 步骤 1: 安装 Certbot

#### Debian/Ubuntu
```bash
sudo apt-get update
sudo apt-get install -y certbot
```

#### CentOS/RHEL
```bash
sudo yum install -y epel-release
sudo yum install -y certbot
```

### 步骤 2: 停止当前 Nginx（如果正在运行）

```bash
# 停止 Docker 容器
docker-compose down

# 或停止系统 Nginx
sudo systemctl stop nginx
```

### 步骤 3: 获取证书

```bash
# 使用 standalone 模式获取证书
sudo certbot certonly --standalone \
  --preferred-challenges http \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

证书将保存在:
- 证书: `/etc/letsencrypt/live/your-domain.com/fullchain.pem`
- 私钥: `/etc/letsencrypt/live/your-domain.com/privkey.pem`

### 步骤 4: 生成 DH 参数

```bash
# 生成 2048 位 DH 参数（需要几分钟）
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
```

### 步骤 5: 创建验证目录

```bash
# 创建 Certbot 验证目录
sudo mkdir -p /var/www/certbot
sudo chmod -R 755 /var/www/certbot
```

### 步骤 6: 更新 Nginx 配置

```bash
# 进入 nginx-gateway 目录
cd nginx-gateway

# 备份原配置
cp nginx.conf nginx.conf.backup

# 编辑 nginx-ssl.conf，替换域名
sed -i 's/your-domain.com/actual-domain.com/g' nginx-ssl.conf

# 使用 SSL 配置
cp nginx-ssl.conf nginx.conf
```

### 步骤 7: 启动服务

```bash
# 使用 SSL 配置启动
docker-compose -f docker-compose-ssl.yml up -d --build

# 查看日志
docker-compose -f docker-compose-ssl.yml logs -f
```

---

## 证书续期

Let's Encrypt 证书有效期为 90 天，需要定期续期。

### 自动续期（推荐）

自动配置脚本已设置 cron 任务，每天凌晨 3 点自动检查并续期：

```bash
# 查看 cron 任务
crontab -l

# 应该看到类似这样的内容:
# 0 3 * * * certbot renew --quiet --post-hook 'docker-compose restart nginx-gateway' >> /var/log/certbot-renew.log 2>&1
```

### 手动续期

```bash
# 测试续期（不会真正执行）
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 重启 Nginx 容器以加载新证书
docker-compose -f docker-compose-ssl.yml restart nginx-gateway
```

### 查看续期日志

```bash
# 查看自动续期日志
tail -f /var/log/certbot-renew.log

# 查看证书过期时间
sudo certbot certificates
```

---

## 配置文件说明

### nginx-ssl.conf

主要配置项：

```nginx
# HTTP 服务器（重定向到 HTTPS）
server {
    listen 80;
    server_name your-domain.com;
    
    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # 重定向到 HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 其他配置...
}
```

### docker-compose-ssl.yml

关键挂载点：

```yaml
volumes:
  # Nginx 配置
  - ./nginx.conf:/etc/nginx/nginx.conf:ro
  
  # SSL 证书
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - /etc/ssl/certs/dhparam.pem:/etc/ssl/certs/dhparam.pem:ro
  
  # Certbot 验证
  - /var/www/certbot:/var/www/certbot:ro
```

---

## 故障排查

### 1. 证书获取失败

**问题**: `Failed to obtain certificate`

**解决方案**:
```bash
# 检查域名解析
nslookup your-domain.com

# 检查 80 端口是否可访问
curl -I http://your-domain.com

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all

# 查看详细错误信息
sudo certbot certonly --standalone -d your-domain.com --dry-run -v
```

### 2. Nginx 启动失败

**问题**: `nginx: [emerg] cannot load certificate`

**解决方案**:
```bash
# 检查证书文件是否存在
ls -l /etc/letsencrypt/live/your-domain.com/

# 检查文件权限
sudo chmod 644 /etc/letsencrypt/archive/your-domain.com/*.pem
sudo chmod 755 /etc/letsencrypt/live/your-domain.com/

# 测试 Nginx 配置
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
```

### 3. HTTPS 无法访问

**问题**: 网页无法打开或证书错误

**解决方案**:
```bash
# 检查 443 端口是否监听
sudo netstat -tlnp | grep :443

# 检查 Docker 容器状态
docker-compose -f docker-compose-ssl.yml ps

# 查看 Nginx 日志
docker-compose -f docker-compose-ssl.yml logs nginx-gateway

# 测试本地访问
curl -k https://localhost
```

### 4. 证书续期失败

**问题**: 自动续期不工作

**解决方案**:
```bash
# 手动测试续期
sudo certbot renew --dry-run

# 检查 cron 服务状态
sudo systemctl status cron

# 手动触发续期
sudo certbot renew --force-renewal

# 查看续期日志
tail -100 /var/log/certbot-renew.log
```

### 5. 混合内容警告

**问题**: 浏览器显示"此页面包含不安全内容"

**解决方案**:
- 确保所有应用的前端都使用相对路径或 HTTPS
- 更新前端 API 地址为 HTTPS
- 检查 Nginx 配置中的 `X-Forwarded-Proto` 头

---

## 安全建议

### 1. SSL 配置优化

```nginx
# 使用现代 TLS 协议
ssl_protocols TLSv1.2 TLSv1.3;

# 使用强加密套件
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

# 启用 HSTS
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 2. 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. 定期检查

```bash
# 测试 SSL 配置安全性
# 访问: https://www.ssllabs.com/ssltest/

# 检查证书状态
sudo certbot certificates

# 查看续期日志
tail -f /var/log/certbot-renew.log
```

---

## 常见问题 (FAQ)

### Q: Let's Encrypt 证书免费吗？
A: 是的，完全免费。证书有效期 90 天，可以无限次续期。

### Q: 可以使用自己的证书吗？
A: 可以。将证书文件放到服务器上，然后修改 `nginx-ssl.conf` 中的证书路径。

### Q: 需要为每个子应用单独配置证书吗？
A: 不需要。所有应用通过同一个域名的不同路径访问，共用一个证书。

### Q: 证书续期会影响服务吗？
A: 不会。续期过程中服务继续运行，只有在重启 Nginx 时会有短暂中断（通常小于 1 秒）。

### Q: 可以同时支持 HTTP 和 HTTPS 吗？
A: 可以，但不推荐。配置会自动将 HTTP 重定向到 HTTPS 以确保安全性。

---

## 参考资源

- [Let's Encrypt 官方文档](https://letsencrypt.org/docs/)
- [Certbot 使用指南](https://certbot.eff.org/instructions)
- [Nginx SSL 配置](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL 配置生成器](https://ssl-config.mozilla.org/)

---

## 技术支持

如有问题，请参考：
- **项目文档**: [DEPLOY.md](../DEPLOY.md)
- **GitHub Issues**: [https://github.com/zhuwei290/plct/issues](https://github.com/zhuwei290/plct/issues)
- **邮箱**: 2903293094@qq.com

---

**祝配置顺利！🎉**

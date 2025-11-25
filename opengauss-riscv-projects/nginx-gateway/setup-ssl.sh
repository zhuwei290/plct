#!/bin/bash

# SSL 证书配置脚本
# 使用 Let's Encrypt 免费证书

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Let's Encrypt SSL 证书配置脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}请使用 root 权限运行此脚本${NC}"
   echo "示例: sudo ./setup-ssl.sh"
   exit 1
fi

# 读取域名
echo -e "${YELLOW}请输入您的域名（例如: example.com）:${NC}"
read -p "域名: " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}域名不能为空！${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}请输入您的邮箱（用于证书通知）:${NC}"
read -p "邮箱: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}邮箱不能为空！${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}配置信息:${NC}"
echo "域名: $DOMAIN"
echo "邮箱: $EMAIL"
echo ""
read -p "确认以上信息正确? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}已取消${NC}"
    exit 1
fi

# 安装 Certbot
echo ""
echo -e "${GREEN}步骤 1/6: 安装 Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    if [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        apt-get update
        apt-get install -y certbot
    elif [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        yum install -y epel-release
        yum install -y certbot
    else
        echo -e "${RED}不支持的系统，请手动安装 Certbot${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Certbot 已安装${NC}"
fi

# 创建证书验证目录
echo ""
echo -e "${GREEN}步骤 2/6: 创建验证目录...${NC}"
mkdir -p /var/www/certbot
chmod -R 755 /var/www/certbot

# 生成 DH 参数（如果不存在）
echo ""
echo -e "${GREEN}步骤 3/6: 生成 DH 参数（这可能需要几分钟）...${NC}"
if [ ! -f /etc/ssl/certs/dhparam.pem ]; then
    openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
    echo -e "${GREEN}DH 参数生成完成${NC}"
else
    echo -e "${GREEN}DH 参数已存在${NC}"
fi

# 暂时停止 Nginx（如果正在运行）
echo ""
echo -e "${GREEN}步骤 4/6: 检查 Nginx 状态...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${YELLOW}停止 Nginx 服务...${NC}"
    systemctl stop nginx
    NGINX_WAS_RUNNING=1
else
    NGINX_WAS_RUNNING=0
fi

# 获取证书
echo ""
echo -e "${GREEN}步骤 5/6: 获取 SSL 证书...${NC}"
certbot certonly --standalone \
    --preferred-challenges http \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}证书获取成功！${NC}"
else
    echo -e "${RED}证书获取失败！${NC}"
    if [ $NGINX_WAS_RUNNING -eq 1 ]; then
        systemctl start nginx
    fi
    exit 1
fi

# 更新 nginx 配置
echo ""
echo -e "${GREEN}步骤 6/6: 更新 Nginx 配置...${NC}"

# 备份原配置
if [ -f nginx.conf ]; then
    cp nginx.conf nginx.conf.backup
    echo -e "${YELLOW}原配置已备份到 nginx.conf.backup${NC}"
fi

# 替换域名占位符
sed -i "s/your-domain.com/$DOMAIN/g" nginx-ssl.conf

# 使用 SSL 配置
cp nginx-ssl.conf nginx.conf

echo -e "${GREEN}Nginx 配置已更新${NC}"

# 设置自动续期
echo ""
echo -e "${GREEN}设置证书自动续期...${NC}"
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'docker-compose restart nginx-gateway' >> /var/log/certbot-renew.log 2>&1") | crontab -

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   SSL 证书配置完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}证书位置:${NC}"
echo "  证书: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  私钥: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo -e "${YELLOW}下一步:${NC}"
echo "1. 重新构建并启动 Nginx 容器:"
echo "   cd nginx-gateway"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
echo "2. 访问您的网站:"
echo "   https://$DOMAIN"
echo ""
echo -e "${YELLOW}注意:${NC}"
echo "- 证书将在 90 天后过期"
echo "- 已设置自动续期（每天凌晨 3 点检查）"
echo "- 续期日志: /var/log/certbot-renew.log"
echo ""
echo -e "${GREEN}配置完成！${NC}"

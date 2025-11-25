#!/bin/bash

# SSL 证书获取脚本 - Webroot 模式
# 适用于服务已在运行的情况

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   获取 SSL 证书 (Webroot 模式)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
   echo -e "${RED}请使用 root 权限运行此脚本${NC}"
   echo "示例: sudo ./get-ssl-cert.sh"
   exit 1
fi

# 域名和邮箱
DOMAIN="ogrsig.top"
EMAIL="2903293094@qq.com"

echo -e "${GREEN}配置信息:${NC}"
echo "域名: $DOMAIN (包含 www.$DOMAIN)"
echo "邮箱: $EMAIL"
echo ""

# 安装 Certbot（如果未安装）
echo -e "${GREEN}步骤 1/5: 检查 Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}安装 Certbot...${NC}"
    if [ -f /etc/debian_version ]; then
        apt-get update
        apt-get install -y certbot
    elif [ -f /etc/redhat-release ]; then
        yum install -y epel-release
        yum install -y certbot
    else
        echo -e "${RED}不支持的系统，请手动安装 Certbot${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Certbot 已安装${NC}"
fi

# 创建验证目录
echo ""
echo -e "${GREEN}步骤 2/5: 创建验证目录...${NC}"
mkdir -p /var/www/certbot
chmod -R 755 /var/www/certbot
echo -e "${GREEN}验证目录创建完成: /var/www/certbot${NC}"

# 生成 DH 参数
echo ""
echo -e "${GREEN}步骤 3/5: 检查 DH 参数...${NC}"
if [ ! -f /etc/ssl/certs/dhparam.pem ]; then
    echo -e "${YELLOW}生成 DH 参数（需要几分钟）...${NC}"
    openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048
    echo -e "${GREEN}DH 参数生成完成${NC}"
else
    echo -e "${GREEN}DH 参数已存在${NC}"
fi

# 检查 Nginx 是否运行
echo ""
echo -e "${GREEN}步骤 4/5: 检查 Nginx 状态...${NC}"
if docker ps | grep -q og-nginx-gateway; then
    echo -e "${GREEN}Nginx 容器正在运行${NC}"
    
    # 测试验证路径是否可访问
    echo -e "${YELLOW}测试验证路径...${NC}"
    TEST_FILE="/var/www/certbot/test-$(date +%s).txt"
    echo "test" > "$TEST_FILE"
    
    sleep 2
    
    if curl -f "http://localhost/.well-known/acme-challenge/$(basename $TEST_FILE)" &>/dev/null; then
        echo -e "${GREEN}验证路径配置正确${NC}"
        rm -f "$TEST_FILE"
    else
        echo -e "${YELLOW}警告: 验证路径可能未正确配置${NC}"
        echo -e "${YELLOW}继续尝试获取证书...${NC}"
        rm -f "$TEST_FILE"
    fi
else
    echo -e "${RED}错误: Nginx 容器未运行${NC}"
    echo -e "${YELLOW}请先启动服务:${NC}"
    echo "  cd /root/plct"
    echo "  docker-compose -f docker-compose.showcase.yml up -d"
    exit 1
fi

# 获取证书（使用 webroot 模式）
echo ""
echo -e "${GREEN}步骤 5/5: 获取 SSL 证书...${NC}"
echo -e "${YELLOW}使用 webroot 模式，不会中断服务${NC}"
echo ""

certbot certonly --webroot \
    -w /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --verbose

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   证书获取成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${YELLOW}证书位置:${NC}"
    echo "  证书: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    echo "  私钥: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo ""
    echo "1. 更新 Nginx 配置使用 SSL:"
    echo "   cd /root/plct/nginx-gateway"
    echo "   sed 's/your-domain.com/$DOMAIN/g' nginx-ssl.conf > nginx.conf"
    echo ""
    echo "2. 重新加载 Nginx 配置:"
    echo "   cd /root/plct"
    echo "   docker-compose -f docker-compose.showcase.yml restart nginx-gateway"
    echo ""
    echo "3. 访问您的网站:"
    echo "   https://$DOMAIN"
    echo "   https://www.$DOMAIN"
    echo ""
    echo -e "${YELLOW}自动续期设置:${NC}"
    echo "添加以下行到 crontab (执行: crontab -e):"
    echo "0 3 * * * certbot renew --quiet --webroot -w /var/www/certbot --post-hook 'docker restart og-nginx-gateway' >> /var/log/certbot-renew.log 2>&1"
    echo ""
    echo -e "${GREEN}完成！${NC}"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}   证书获取失败${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}可能的原因:${NC}"
    echo "1. 域名未正确解析到本服务器"
    echo "2. 防火墙/安全组未开放 80 端口"
    echo "3. Nginx 配置错误，验证路径无法访问"
    echo ""
    echo -e "${YELLOW}排查步骤:${NC}"
    echo "1. 检查域名解析:"
    echo "   nslookup $DOMAIN"
    echo ""
    echo "2. 检查 80 端口是否可从外网访问:"
    echo "   curl http://$DOMAIN/.well-known/acme-challenge/test"
    echo ""
    echo "3. 检查腾讯云安全组是否开放 80 和 443 端口"
    echo ""
    echo "4. 查看详细日志:"
    echo "   cat /var/log/letsencrypt/letsencrypt.log"
    echo ""
    exit 1
fi

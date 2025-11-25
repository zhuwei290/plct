# openGauss RISC-V 应用展示中心部署指南

## 架构说明

- **腾讯云服务器**: 运行展示网站和Nginx网关（公网IP）
- **SG2042开发板**: 运行各个应用容器（Docker）
- **连接方式**: 
  - 方案A: SG2042有公网IP → 直接连接
  - 方案B: SG2042无公网IP → 使用frp内网穿透

## 部署步骤

### 第一步：在SG2042上部署应用

#### 1. 部署留言板应用
```bash
cd opengauss-riscv-messageboard

# 端口已配置为 8001（在 docker-compose.yml 中）
# 启动服务
docker-compose up -d

# 验证
curl http://localhost:8001
```

#### 2. 部署诊疗系统
```bash
cd spring-petclinic-compose

# 端口已配置为 8002（在 docker-compose.yml 中）
# 启动服务
docker-compose up -d

# 验证
curl http://localhost:8002
```

#### 3. 部署 Java Shop 在线商城
```bash
cd java-shop

# 端口已配置为 8009（后端）、8010（前端）
# 启动服务
chmod +x start-app.sh
./start-app.sh

# 或手动启动
docker-compose up -d

# 验证
curl http://localhost:8009/api/health
curl http://localhost:8010
```

#### 4. 部署其他应用

类似地，部署其他应用（Go Todo、Go Library等），参考各应用目录中的 README.md 文件。

### 第二步：配置内网穿透（如果SG2042无公网IP）

#### 在腾讯云服务器上安装frp服务端
```bash
# 下载frp
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_amd64.tar.gz
tar -xzf frp_0.52.3_linux_amd64.tar.gz
cd frp_0.52.3_linux_amd64

# 创建配置文件
cat > frps.ini << EOF
[common]
bind_port = 7000
token = xx
allow_ports = 8001-8010,9966
EOF

# 启动frp服务端
./frps -c frps.ini

# 或使用systemd服务（推荐）
sudo cp frps /usr/local/bin/
sudo cp systemd/frps.service /etc/systemd/system/
sudo sed -i 's/ExecStart=.*/ExecStart=\/usr\/local\/bin\/frps -c \/etc\/frp\/frps.ini/' /etc/systemd/system/frps.service
sudo mkdir -p /etc/frp
sudo cp frps.ini /etc/frp/
sudo systemctl daemon-reload
sudo systemctl enable frps
sudo systemctl start frps
```

#### 在SG2042上安装frp客户端
```bash
# 下载frp（RISC-V版本）
wget https://github.com/fatedier/frp/releases/download/v0.52.3/frp_0.52.3_linux_riscv64.tar.gz
tar -xzf frp_0.52.3_linux_riscv64.tar.gz
cd frp_0.52.3_linux_riscv64

# 创建配置文件
cat > frpc.ini << EOF
[common]
server_addr = xx
server_port = 7000
token = xx

[messageboard]
type = tcp
local_ip = 127.0.0.1
local_port = 8001
remote_port = 8001

[petclinic]
type = tcp
local_ip = 127.0.0.1
local_port = 8002
remote_port = 8002

[petclinic-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 9966
remote_port = 9966

[2048]
type = tcp
local_ip = 127.0.0.1
local_port = 8003
remote_port = 8003

[2048-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 8004
remote_port = 8004

[go-todo-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 8005
remote_port = 8005

[go-todo-frontend]
type = tcp
local_ip = 127.0.0.1
local_port = 8006
remote_port = 8006

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

[java-shop-backend]
type = tcp
local_ip = 127.0.0.1
local_port = 8009
remote_port = 8009

[java-shop-frontend]
type = tcp
local_ip = 127.0.0.1
local_port = 8010
remote_port = 8010
EOF

# 启动frp客户端
./frpc -c frpc.ini

# 或使用systemd服务
sudo cp frpc /usr/local/bin/
sudo cp systemd/frpc.service /etc/systemd/system/
sudo sed -i 's/ExecStart=.*/ExecStart=\/usr\/local\/bin\/frpc -c \/etc\/frp\/frpc.ini/' /etc/systemd/system/frpc.service
sudo mkdir -p /etc/frp
sudo cp frpc.ini /etc/frp/
sudo systemctl daemon-reload
sudo systemctl enable frpc
sudo systemctl start frpc
```

### 第三步：在腾讯云服务器上部署展示网站

```bash
# 1. 克隆或上传项目到服务器
cd /opt
git clone <your-repo> opengauss-riscv-projects
cd opengauss-riscv-projects

# 2. 修改nginx配置
# 如果SG2042有公网IP，编辑 nginx-gateway/nginx.conf
# 将 upstream 中的 127.0.0.1 改为 SG2042 的公网IP
# 
# 如果使用内网穿透，确保 upstream 指向 127.0.0.1:8001, 127.0.0.1:8002 和 127.0.0.1:9966

# 3. 启动展示网站和网关
docker-compose -f docker-compose.showcase.yml up -d

# 4. 查看日志
docker-compose -f docker-compose.showcase.yml logs -f

# 5. 验证
curl http://localhost
```

### 第四步：配置防火墙

#### 腾讯云服务器安全组（重要！）

**必须先在腾讯云控制台配置安全组规则，否则frp无法连接！**

1. **登录腾讯云控制台**
   - 访问：https://console.cloud.tencent.com/
   - 进入"云服务器 CVM" → "安全组"

2. **找到你的服务器对应的安全组**
   - 点击安全组ID进入详情

3. **添加入站规则**
   - 点击"入站规则" → "添加规则"
   - 添加以下规则：
     ```
     类型: 自定义
     来源: 0.0.0.0/0
     协议端口: TCP:7000
     策略: 允许
     备注: frp服务端端口
     ```
   - 同样添加端口 80 和 443（如果使用HTTPS）

4. **验证安全组规则**
   ```bash
   # 在服务器上检查端口是否监听
   netstat -tlnp | grep 7000
   # 应该看到类似：tcp  0  0.0.0.0:7000  0.0.0.0:*  LISTEN  xxxx/frps
   ```

#### 腾讯云服务器本地防火墙

```bash
# 检查防火墙状态
systemctl status firewalld
# 或
systemctl status iptables

# 如果使用 firewalld，开放端口
sudo firewall-cmd --permanent --add-port=7000/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# 如果使用 iptables，添加规则
sudo iptables -A INPUT -p tcp --dport 7000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables-save > /etc/sysconfig/iptables
```

#### SG2042防火墙（如果有）
```bash
# 允许本地端口
sudo ufw allow 8001/tcp
sudo ufw allow 8002/tcp
sudo ufw allow 9966/tcp
```

#### 测试连接

配置完防火墙后，测试连接：

```bash
# 在SG2042上测试能否连接到腾讯云服务器的7000端口
telnet 101.43.155.110 7000
# 或
nc -zv 101.43.155.110 7000

# 如果连接成功，应该看到连接建立
# 如果失败，检查：
# 1. 腾讯云安全组是否已开放7000端口
# 2. 服务器本地防火墙是否已开放
# 3. frps服务是否正在运行
```

## 验证部署

1. **访问展示网站**: `http://your-tencent-cloud-ip`
2. **访问留言板**: `http://your-tencent-cloud-ip/messageboard`
3. **访问诊疗系统**: `http://your-tencent-cloud-ip/petclinic`

## 维护命令

### 腾讯云服务器
```bash
# 查看所有服务状态
docker-compose -f docker-compose.showcase.yml ps

# 查看日志
docker-compose -f docker-compose.showcase.yml logs -f nginx-gateway
docker-compose -f docker-compose.showcase.yml logs -f showcase

# 重启服务
docker-compose -f docker-compose.showcase.yml restart

# 更新展示网站
docker-compose -f docker-compose.showcase.yml up -d --build showcase

# 检查frp连接（如果使用）
journalctl -u frps -f
```

### SG2042开发板
```bash
# 查看应用状态
cd opengauss-riscv-messageboard
docker-compose ps

cd ../spring-petclinic-compose
docker-compose ps

# 查看应用日志
docker-compose logs -f

# 重启应用
docker-compose restart

# 检查frp连接（如果使用）
journalctl -u frpc -f
```

## 故障排查

### 1. 应用无法访问

**检查SG2042上的应用是否正常运行**
```bash
# 在SG2042上执行
docker ps
docker logs messageboard-web
docker logs <petclinic-frontend-container>
```

**检查端口是否正确映射**
```bash
# 在SG2042上执行
netstat -tlnp | grep 8001
netstat -tlnp | grep 8002
```

**检查frp连接（如果使用）**
```bash
# 在SG2042上执行
ps aux | grep frpc
journalctl -u frpc -f

# 在腾讯云服务器上执行
ps aux | grep frps
journalctl -u frps -f
```

### 2. frp连接失败（i/o timeout）

**这是最常见的问题，通常是防火墙/安全组未开放端口**

**步骤1: 检查腾讯云安全组**
1. 登录腾讯云控制台
2. 进入"云服务器 CVM" → "安全组"
3. 找到服务器对应的安全组
4. 检查"入站规则"中是否有端口7000的规则
5. 如果没有，添加规则：TCP:7000，来源0.0.0.0/0，策略允许

**步骤2: 检查服务器本地防火墙**
```bash
# 在腾讯云服务器上执行
# 检查防火墙状态
systemctl status firewalld
# 或
systemctl status iptables

# 如果使用firewalld
sudo firewall-cmd --list-ports
sudo firewall-cmd --permanent --add-port=7000/tcp
sudo firewall-cmd --reload

# 如果使用iptables
sudo iptables -L -n | grep 7000
sudo iptables -A INPUT -p tcp --dport 7000 -j ACCEPT
sudo iptables-save
```

**步骤3: 验证端口监听**
```bash
# 在腾讯云服务器上执行
netstat -tlnp | grep 7000
# 应该看到：tcp  0  0.0.0.0:7000  0.0.0.0:*  LISTEN  xxxx/frps
```

**步骤4: 测试连接**
```bash
# 在SG2042上执行
telnet 101.43.155.110 7000
# 或
nc -zv 101.43.155.110 7000

# 如果连接成功，frp客户端应该能正常连接
# 如果仍然失败，检查：
# - frps服务是否正在运行
# - token是否匹配
# - 网络路由是否正常
```

**步骤5: 检查frp服务状态**
```bash
# 在腾讯云服务器上
ps aux | grep frps
# 查看frps日志（如果使用systemd）
journalctl -u frps -f

# 在SG2042上
ps aux | grep frpc
journalctl -u frpc -f
```

### 3. Nginx网关无法连接SG2042

**检查网络连接**
```bash
# 在腾讯云服务器上执行
ping sg2042-ip
telnet sg2042-ip 8001
telnet sg2042-ip 8002
```

**如果使用内网穿透，检查frp转发**
```bash
# 在腾讯云服务器上执行
telnet 127.0.0.1 8001
telnet 127.0.0.1 8002

# 如果连接失败，检查frp客户端是否正常运行
# 在SG2042上检查
systemctl status frpc
journalctl -u frpc -f
```

**检查nginx配置**
```bash
# 在腾讯云服务器上执行
docker exec og-nginx-gateway nginx -t
docker logs og-nginx-gateway
```

### 4. 展示网站无法加载

**检查容器状态**
```bash
docker ps | grep og-showcase
docker ps | grep og-nginx-gateway
```

**查看容器日志**
```bash
docker logs og-showcase
docker logs og-nginx-gateway
```

**检查nginx网关日志**
```bash
docker exec og-nginx-gateway cat /var/log/nginx/error.log
```

### 4. 应用状态显示离线

**检查应用健康检查端点**
```bash
# 留言板健康检查
curl http://your-tencent-cloud-ip/api/messageboard/health

# 诊疗系统（如果有健康检查端点）
curl http://your-tencent-cloud-ip/petclinic/
```

**检查浏览器控制台**
- 打开浏览器开发者工具（F12）
- 查看 Console 和 Network 标签
- 检查是否有 CORS 或其他错误

## 端口说明

| 服务 | SG2042端口 | 说明 |
|------|-----------|------|
| 留言板前端 | 8001 | 通过网关访问 /messageboard |
| 诊疗系统前端 | 8002 | 通过网关访问 /petclinic |
| 诊疗系统后端API | 9966 | 直接访问后端API（绕过前端Nginx） |
| 2048游戏前端 | 8003 | 通过网关访问 /games/2048 |
| 2048游戏后端API | 8004 | 通过网关访问 /games/api |
| Go Todo后端API | 8005 | 通过网关访问 /go-todo/api |
| Go Todo前端 | 8006 | 通过网关访问 /go-todo |
| Go Library后端API | 8007 | 通过网关访问 /go-library/api |
| Go Library前端 | 8008 | 通过网关访问 /go-library |
| Java Shop后端API | 8009 | 通过网关访问 /java-shop/api |
| Java Shop前端 | 8010 | 通过网关访问 /java-shop |
| frp服务端 | 7000 | 内网穿透服务端口（可选） |
| frp客户端 | 8001-8010, 9966 | 转发到本地应用端口 |

| 服务 | 腾讯云端口 | 说明 |
|------|-----------|------|
| Nginx网关 | 80 | 统一入口，反向代理 |
| frp转发 | 8001-8008, 9966 | 从frp客户端转发（如果使用） |

## 安全建议

1. **使用HTTPS**: 配置SSL证书，启用HTTPS访问
2. **设置frp token**: 如果使用内网穿透，务必设置强密码token
3. **限制访问**: 使用防火墙规则限制不必要的端口访问
4. **定期更新**: 保持Docker镜像和系统更新
5. **日志监控**: 定期检查日志，发现异常访问

## 扩展应用

要添加新的应用：

1. **在SG2042上部署应用**，使用新的端口（如8003）
2. **修改 `showcase/app.js`**，添加新应用到 `apps` 数组
3. **修改 `nginx-gateway/nginx.conf`**，添加新的 upstream 和 location
4. **如果使用frp**，在SG2042的 `frpc.ini` 中添加新的转发配置
5. **重启服务**:
   ```bash
   # 腾讯云服务器
   docker-compose -f docker-compose.showcase.yml restart nginx-gateway
   
   # SG2042（如果使用frp）
   systemctl restart frpc
   ```

## 联系支持

如有问题，请查看：
- [openGauss 官方文档](https://docs.opengauss.org/)
- [项目GitHub Issues](https://github.com/zhuwei290/plct/tree/main)


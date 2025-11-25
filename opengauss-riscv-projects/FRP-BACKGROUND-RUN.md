# frp 客户端后台运行指南

## 方法1: 使用 nohup（推荐，简单快速）

```bash
# 在 frp 目录下执行
cd /path/to/frp_0.52.3_linux_riscv64

# 使用 nohup 后台运行，输出到 frpc.log
nohup ./frpc -c frpc.ini > frpc.log 2>&1 &

# 查看进程
ps aux | grep frpc

# 查看日志
tail -f frpc.log

# 停止进程
pkill frpc
# 或
kill $(ps aux | grep '[f]rpc' | awk '{print $2}')
```

## 方法2: 使用 systemd 服务（推荐，生产环境）

这是最推荐的方法，可以实现开机自启、自动重启等功能。

### 步骤1: 复制文件到系统目录

```bash
cd /path/to/frp_0.52.3_linux_riscv64

# 复制可执行文件
sudo cp frpc /usr/local/bin/

# 创建配置目录
sudo mkdir -p /etc/frp

# 复制配置文件
sudo cp frpc.ini /etc/frp/
```

### 步骤2: 创建 systemd 服务文件

```bash
sudo tee /etc/systemd/system/frpc.service > /dev/null <<EOF
[Unit]
Description=frp Client Service
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/frpc -c /etc/frp/frpc.ini
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=process
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### 步骤3: 启动和管理服务

```bash
# 重新加载 systemd 配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start frpc

# 设置开机自启
sudo systemctl enable frpc

# 查看服务状态
sudo systemctl status frpc

# 查看日志
sudo journalctl -u frpc -f

# 停止服务
sudo systemctl stop frpc

# 重启服务
sudo systemctl restart frpc

# 禁用开机自启
sudo systemctl disable frpc
```

## 方法3: 使用 screen（适合临时使用）

```bash
# 安装 screen（如果没有）
sudo dnf install screen  # Fedora/RHEL
# 或
sudo apt-get install screen  # Ubuntu/Debian

# 创建新的 screen 会话
screen -S frpc

# 在 screen 中运行 frp
cd /path/to/frp_0.52.3_linux_riscv64
./frpc -c frpc.ini

# 按 Ctrl+A 然后按 D 来分离会话（后台运行）

# 重新连接到会话
screen -r frpc

# 列出所有 screen 会话
screen -ls

# 杀死会话
screen -X -S frpc quit
```

## 方法4: 使用 tmux（类似 screen）

```bash
# 安装 tmux（如果没有）
sudo dnf install tmux  # Fedora/RHEL
# 或
sudo apt-get install tmux  # Ubuntu/Debian

# 创建新的 tmux 会话
tmux new -s frpc

# 在 tmux 中运行 frp
cd /path/to/frp_0.52.3_linux_riscv64
./frpc -c frpc.ini

# 按 Ctrl+B 然后按 D 来分离会话（后台运行）

# 重新连接到会话
tmux attach -t frpc

# 列出所有 tmux 会话
tmux ls

# 杀死会话
tmux kill-session -t frpc
```

## 方法5: 使用 & 后台运行（不推荐）

```bash
# 后台运行（输出会丢失）
./frpc -c frpc.ini &

# 查看进程
ps aux | grep frpc

# 停止进程
pkill frpc
```

**注意**: 这种方法不推荐，因为：
- 输出日志会丢失
- 终端关闭后进程可能被杀死
- 无法自动重启

## 推荐方案对比

| 方法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **systemd** | 开机自启、自动重启、日志管理完善 | 需要 root 权限 | **生产环境（推荐）** |
| **nohup** | 简单快速、不需要 root | 需要手动管理进程 | 临时使用、测试环境 |
| **screen/tmux** | 可以随时查看输出、交互式 | 需要保持会话 | 调试、开发环境 |
| **&** | 最简单 | 日志丢失、不稳定 | 不推荐 |

## 快速设置脚本（systemd）

如果你想要一键设置 systemd 服务，可以使用以下脚本：

```bash
#!/bin/bash
# 保存为 setup-frpc-service.sh

FRP_DIR="/path/to/frp_0.52.3_linux_riscv64"  # 修改为你的 frp 目录

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then 
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 复制文件
cp "$FRP_DIR/frpc" /usr/local/bin/
mkdir -p /etc/frp
cp "$FRP_DIR/frpc.ini" /etc/frp/

# 创建服务文件
cat > /etc/systemd/system/frpc.service <<EOF
[Unit]
Description=frp Client Service
After=network.target

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s
ExecStart=/usr/local/bin/frpc -c /etc/frp/frpc.ini
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=process
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 启动服务
systemctl daemon-reload
systemctl enable frpc
systemctl start frpc

# 显示状态
systemctl status frpc

echo ""
echo "✅ frp 客户端服务已设置完成！"
echo ""
echo "常用命令："
echo "  查看状态: sudo systemctl status frpc"
echo "  查看日志: sudo journalctl -u frpc -f"
echo "  重启服务: sudo systemctl restart frpc"
echo "  停止服务: sudo systemctl stop frpc"
```

使用方法：
```bash
# 修改脚本中的 FRP_DIR 路径
nano setup-frpc-service.sh

# 运行脚本
sudo bash setup-frpc-service.sh
```

## 验证 frp 客户端是否正常运行

无论使用哪种方法，都可以通过以下方式验证：

```bash
# 方法1: 检查进程
ps aux | grep frpc

# 方法2: 检查端口（如果配置了 admin_port）
curl http://127.0.0.1:7400/api/proxy/tcp  # 默认管理端口

# 方法3: 查看日志
# systemd: sudo journalctl -u frpc -f
# nohup: tail -f frpc.log
# screen/tmux: 直接查看终端输出

# 方法4: 测试端口转发（在腾讯云服务器上）
curl http://127.0.0.1:8001  # 留言板
curl http://127.0.0.1:8002  # 诊疗系统前端
curl http://127.0.0.1:9966/petclinic/api/vets  # 诊疗系统后端
```

## 常见问题

### Q: 如何查看 frp 客户端的实时日志？

**systemd 方式**:
```bash
sudo journalctl -u frpc -f
```

**nohup 方式**:
```bash
tail -f /path/to/frp_0.52.3_linux_riscv64/frpc.log
```

**screen/tmux 方式**:
直接连接到会话查看

### Q: 如何重启 frp 客户端？

**systemd 方式**:
```bash
sudo systemctl restart frpc
```

**nohup 方式**:
```bash
pkill frpc
nohup ./frpc -c frpc.ini > frpc.log 2>&1 &
```

**screen/tmux 方式**:
在会话中按 Ctrl+C 停止，然后重新运行

### Q: 如何确保 frp 客户端开机自启？

只有 **systemd 方式** 支持开机自启：
```bash
sudo systemctl enable frpc
```

### Q: frp 客户端意外退出怎么办？

**systemd 方式** 会自动重启（如果配置了 `Restart=on-failure`）

**nohup 方式** 需要手动重启，或使用 supervisor 等进程管理工具

### Q: 如何修改 frp 客户端配置？

```bash
# 编辑配置文件
sudo nano /etc/frp/frpc.ini  # systemd 方式
# 或
nano /path/to/frp_0.52.3_linux_riscv64/frpc.ini  # 其他方式

# 重启服务（systemd）
sudo systemctl restart frpc

# 或重启进程（其他方式）
pkill frpc
# 然后重新启动
```


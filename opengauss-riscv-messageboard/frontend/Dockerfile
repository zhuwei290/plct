# openGauss RISC-V 留言板前端服务
# 使用RISC-V64架构构建，与后端和数据库保持一致

# ==========================================
# 构建阶段 - 使用RISC-V64架构构建
# ==========================================
FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64 AS builder
WORKDIR /app

# 安装Node.js和npm
RUN dnf install -y nodejs npm && dnf clean all

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ==========================================
# 运行阶段 - 使用RISC-V64架构运行
# ==========================================
FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64

# 安装nginx和curl
RUN dnf install -y nginx curl && dnf clean all

# 从构建阶段复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建nginx运行所需目录
RUN mkdir -p /var/log/nginx /var/lib/nginx/tmp && \
    chmod -R 755 /var/log/nginx /var/lib/nginx

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# 暴露端口
EXPOSE 80

# 启动nginx
CMD ["nginx", "-g", "daemon off;"]


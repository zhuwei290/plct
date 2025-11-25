# openGauss RISC-V 留言板后端服务
# 可在 x86-64 架构上使用 qemu-user-static 模拟 riscv64 架构

# ==========================================
# 运行阶段 - RISC-V64（直接构建）
# ==========================================
FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64
WORKDIR /app

# 安装Python 3、编译工具和必要的依赖
RUN dnf install -y python3 python3-pip python3-devel gcc gcc-c++ make \
    postgresql postgresql-devel libpq-devel curl && \
    dnf clean all

# 复制requirements文件
COPY requirements.txt .

# 在 RISC-V 上直接安装 Python 包
RUN pip3 install --no-cache-dir -r requirements.txt

# 设置环境变量
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# 复制应用代码
COPY main.py .

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python3", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]


FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# 安装基础依赖
RUN dnf install -y python3 python3-pip python3-devel gcc gcc-c++ make \
    postgresql postgresql-devel libpq-devel curl && \
    dnf clean all

# 复制 requirements.txt
COPY requirements.txt .

# 安装 Python 包
RUN pip3 install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

EXPOSE 8004

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]

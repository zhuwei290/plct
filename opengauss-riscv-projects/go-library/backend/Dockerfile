FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64

# 安装 Go 和必要的工具
RUN dnf install -y golang git curl postgresql postgresql-devel && \
    dnf clean all

WORKDIR /app

# 配置 Go 环境变量
ENV GOPROXY=https://goproxy.cn,direct
ENV GOSUMDB=off
ENV GO111MODULE=on
ENV GOFLAGS=-mod=mod

# 先复制 go.mod 文件
COPY go.mod ./

# 复制源代码（go mod 需要源代码来分析依赖）
COPY *.go ./

# 下载依赖并自动生成 go.sum
RUN echo "下载 Go 依赖..." && \
    rm -f go.sum && \
    go mod download && \
    go mod tidy && \
    echo "依赖下载完成，go.sum 已生成"

# 构建应用
RUN CGO_ENABLED=1 GOOS=linux GOARCH=riscv64 go build -o library-api .

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8007/health || exit 1

EXPOSE 8007

CMD ["./library-api"]

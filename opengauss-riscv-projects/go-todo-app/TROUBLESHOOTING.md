# 故障排查指南

## Go 模块下载问题

### 问题：无法下载 gitee.com 模块

**错误信息：**
```
go: gitee.com/opengauss/openGauss-connector-go-pq@v1.0.0: GOPROXY list is not the empty string, but contains no entries
```

### 解决方案

#### 方案 1：使用 goproxy.cn（推荐）

Dockerfile 已配置使用 `goproxy.cn` 作为代理，如果仍然失败，请检查网络连接。

#### 方案 2：使用 direct 模式

如果代理无法访问，Dockerfile 会自动回退到 direct 模式，直接从 git 仓库获取。

#### 方案 3：手动下载依赖（如果网络完全无法访问）

1. **在本地环境下载依赖：**
```bash
cd backend
export GOPROXY=direct
export GOSUMDB=off
go mod download
go mod tidy
```

2. **将依赖复制到 Docker 镜像：**
修改 Dockerfile，在下载依赖前先复制本地依赖：
```dockerfile
# 复制本地依赖缓存（如果存在）
COPY go.sum ./
COPY vendor/ ./vendor/  # 如果使用 vendor 模式
```

3. **使用 vendor 模式：**
```bash
cd backend
go mod vendor
```

然后在 Dockerfile 中添加：
```dockerfile
COPY vendor/ ./vendor/
ENV GOFLAGS=-mod=vendor
```

#### 方案 4：使用 GitHub 镜像（如果存在）

如果 openGauss 驱动有 GitHub 镜像，可以在 go.mod 中使用 replace：

```go
replace gitee.com/opengauss/openGauss-connector-go-pq => github.com/opengauss/openGauss-connector-go-pq v1.0.0
```

### 检查网络连接

```bash
# 测试 gitee.com 连接
curl -I https://gitee.com/opengauss/openGauss-connector-go-pq

# 测试 goproxy.cn 连接
curl -I https://goproxy.cn
```

### 构建时指定代理

```bash
docker build --build-arg GOPROXY=https://goproxy.cn,direct -t go-todo-backend .
```

### 使用代理服务器

如果在内网环境，可以配置代理：

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
  -t go-todo-backend .
```

## 其他常见问题

### 问题：数据库连接失败

**检查：**
1. 数据库容器是否正常运行：`docker-compose ps database`
2. 数据库健康检查：`docker exec og-todo-db gsql -d postgres -c "SELECT 1;"`
3. 环境变量是否正确：检查 `.env` 文件

### 问题：JWT Token 无效

**检查：**
1. JWT_SECRET 环境变量是否设置
2. 前后端 JWT_SECRET 是否一致
3. Token 是否过期（7天）

### 问题：端口冲突

**检查：**
```bash
# 检查端口占用
netstat -tlnp | grep 8005
netstat -tlnp | grep 8006

# 修改 docker-compose.yml 中的端口映射
```

## 构建优化

### 使用构建缓存

```bash
# 清理构建缓存
docker builder prune

# 使用缓存构建
docker-compose build --no-cache
```

### 多阶段构建优化

如果需要优化构建速度，可以考虑多阶段构建，将依赖下载和构建分离。


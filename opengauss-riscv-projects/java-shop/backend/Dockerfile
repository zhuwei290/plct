FROM --platform=linux/riscv64 maven:3.9-eclipse-temurin-17 as builder

WORKDIR /app

# 配置 Maven 使用华为云镜像以加速下载和避免 SSL 问题
RUN mkdir -p /root/.m2 && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /root/.m2/settings.xml && \
    echo '<settings>' >> /root/.m2/settings.xml && \
    echo '  <mirrors>' >> /root/.m2/settings.xml && \
    echo '    <mirror>' >> /root/.m2/settings.xml && \
    echo '      <id>huaweicloud</id>' >> /root/.m2/settings.xml && \
    echo '      <mirrorOf>central</mirrorOf>' >> /root/.m2/settings.xml && \
    echo '      <url>https://repo.huaweicloud.com/repository/maven/</url>' >> /root/.m2/settings.xml && \
    echo '    </mirror>' >> /root/.m2/settings.xml && \
    echo '  </mirrors>' >> /root/.m2/settings.xml && \
    echo '</settings>' >> /root/.m2/settings.xml

# 复制 pom.xml 并下载依赖
COPY pom.xml .
RUN mvn dependency:resolve -B

# 复制源代码并构建
COPY src ./src
RUN mvn clean package -DskipTests -q

# 运行阶段
FROM --platform=linux/riscv64 eclipse-temurin:17-jre

WORKDIR /app

# 复制 jar 文件
COPY --from=builder /app/target/*.jar app.jar

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8009/api/health || exit 1

EXPOSE 8009

ENTRYPOINT ["java", "-jar", "app.jar"]

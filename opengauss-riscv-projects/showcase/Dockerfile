FROM nginx:alpine

WORKDIR /usr/share/nginx/html

# 复制静态文件
COPY index.html .
COPY style.css .
COPY app.js .

# 配置 Nginx
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css)$ { \
        expires 1h; \
        add_header Cache-Control "public"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


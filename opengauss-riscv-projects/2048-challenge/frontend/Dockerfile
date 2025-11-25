FROM --platform=linux/riscv64 xfan1024/openeuler:24.03-riscv64

RUN dnf install -y nginx curl && dnf clean all

WORKDIR /usr/share/nginx/html

COPY index.html .
COPY style.css .
COPY app.js .

COPY nginx.conf /etc/nginx/nginx.conf

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]


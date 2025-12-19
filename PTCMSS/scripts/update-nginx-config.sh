#!/bin/bash

# Script cập nhật lại cấu hình Nginx (sau khi sửa script setup-domain.sh)
# Sử dụng: sudo ./scripts/update-nginx-config.sh

set -e

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Vui lòng chạy với sudo${NC}"
    exit 1
fi

DOMAIN="hethongvantai.site"
API_DOMAIN="api.$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/ptcmss"

echo -e "${GREEN}🔄 Đang cập nhật cấu hình Nginx...${NC}"
echo ""

# Di chuyển đến thư mục dự án
cd "$(dirname "$0")/.."

# Chạy lại phần cập nhật cấu hình từ setup-domain.sh
echo -e "${YELLOW}📝 Đang tạo lại cấu hình Nginx...${NC}"

# Đọc cấu hình từ setup-domain.sh (từ dòng 176 đến 313)
# Tạm thời, tôi sẽ tạo lại cấu hình đầy đủ
cat > "$NGINX_CONFIG" <<'NGINX_EOF'
# Upstream cho Backend
upstream backend {
    server 127.0.0.1:8080;
}

# Upstream cho Frontend
upstream frontend {
    server 127.0.0.1:5173;
}

# Frontend - HTTP (redirect to HTTPS)
server {
    listen 80;
    server_name hethongvantai.site www.hethongvantai.site;
    return 301 https://$server_name$request_uri;
}

# Frontend - HTTPS
server {
    listen 443 ssl http2;
    server_name hethongvantai.site www.hethongvantai.site;

    ssl_certificate /etc/letsencrypt/live/hethongvantai.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hethongvantai.site/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/ptcmss-frontend-access.log;
    error_log /var/log/nginx/ptcmss-frontend-error.log;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Backend API - HTTP (redirect to HTTPS)
server {
    listen 80;
    server_name api.hethongvantai.site;
    return 301 https://$server_name$request_uri;
}

# Backend API - HTTPS
server {
    listen 443 ssl http2;
    server_name api.hethongvantai.site;

    ssl_certificate /etc/letsencrypt/live/hethongvantai.site/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hethongvantai.site/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/ptcmss-backend-access.log;
    error_log /var/log/nginx/ptcmss-backend-error.log;

    add_header Access-Control-Allow-Origin "https://hethongvantai.site" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        
        # Ẩn CORS headers từ backend để tránh trùng lặp (Nginx đã xử lý CORS)
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Allow-Credentials;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        
        # Ẩn CORS headers từ backend để tránh trùng lặp (Nginx đã xử lý CORS)
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Allow-Credentials;
    }
}
NGINX_EOF

# Kiểm tra cấu hình
echo -e "${YELLOW}🔍 Đang kiểm tra cấu hình Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Cấu hình Nginx hợp lệ${NC}"
else
    echo -e "${RED}❌ Cấu hình Nginx không hợp lệ${NC}"
    exit 1
fi

# Reload Nginx
echo -e "${YELLOW}🔄 Đang reload Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx đã được reload${NC}"

echo ""
echo -e "${GREEN}✅ Hoàn tất! Cấu hình Nginx đã được cập nhật.${NC}"
echo -e "${YELLOW}💡 Lỗi CORS trùng lặp đã được sửa.${NC}"


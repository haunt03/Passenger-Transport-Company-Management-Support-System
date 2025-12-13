#!/bin/bash

# Script tự động setup domain và SSL cho PTCMSS
# Sử dụng: ./setup-domain.sh yourdomain.com

set -e

# Màu sắc cho output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kiểm tra domain được truyền vào
if [ -z "$1" ]; then
    echo -e "${RED}❌ Lỗi: Chưa nhập domain${NC}"
    echo "Sử dụng: ./setup-domain.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
API_DOMAIN="api.$DOMAIN"
NGINX_CONFIG="/etc/nginx/sites-available/ptcmss"
NGINX_ENABLED="/etc/nginx/sites-enabled/ptcmss"

echo -e "${GREEN}🚀 Bắt đầu setup domain: $DOMAIN${NC}"

# 1. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Vui lòng chạy script với quyền root (sudo)${NC}"
    exit 1
fi

# 2. Cài đặt Nginx (nếu chưa có)
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Đang cài đặt Nginx...${NC}"
    apt update
    apt install nginx -y
    systemctl enable nginx
    systemctl start nginx
    echo -e "${GREEN}✅ Đã cài đặt Nginx${NC}"
else
    echo -e "${GREEN}✅ Nginx đã được cài đặt${NC}"
fi

# 3. Tạo file cấu hình Nginx (chỉ HTTP trước, SSL sẽ được thêm sau khi có certificate)
echo -e "${YELLOW}📝 Đang tạo file cấu hình Nginx (HTTP tạm thời)...${NC}"

cat > "$NGINX_CONFIG" <<EOF
# Upstream cho Backend
upstream backend {
    server 127.0.0.1:8080;
}

# Upstream cho Frontend
upstream frontend {
    server 127.0.0.1:5173;
}

# Frontend - HTTP (tạm thời, sẽ được certbot cập nhật thành HTTPS)
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    access_log /var/log/nginx/ptcmss-frontend-access.log;
    error_log /var/log/nginx/ptcmss-frontend-error.log;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Backend API - HTTP (tạm thời, sẽ được certbot cập nhật thành HTTPS)
server {
    listen 80;
    server_name $API_DOMAIN;

    access_log /var/log/nginx/ptcmss-backend-access.log;
    error_log /var/log/nginx/ptcmss-backend-error.log;

    add_header Access-Control-Allow-Origin "http://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if (\$request_method = 'OPTIONS') {
        return 204;
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_buffering off;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF

# 4. Tạo symbolic link
if [ -L "$NGINX_ENABLED" ]; then
    rm "$NGINX_ENABLED"
fi
ln -s "$NGINX_CONFIG" "$NGINX_ENABLED"

# 5. Kiểm tra cấu hình Nginx
echo -e "${YELLOW}🔍 Đang kiểm tra cấu hình Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Cấu hình Nginx hợp lệ${NC}"
else
    echo -e "${RED}❌ Cấu hình Nginx không hợp lệ${NC}"
    exit 1
fi

# 5.1. Reload Nginx để áp dụng cấu hình HTTP
echo -e "${YELLOW}🔄 Đang reload Nginx với cấu hình HTTP...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx đã được reload${NC}"

# 6. Cài đặt Certbot (nếu chưa có)
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Đang cài đặt Certbot...${NC}"
    apt install certbot python3-certbot-nginx -y
    echo -e "${GREEN}✅ Đã cài đặt Certbot${NC}"
else
    echo -e "${GREEN}✅ Certbot đã được cài đặt${NC}"
fi

# 7. Mở firewall
echo -e "${YELLOW}🔥 Đang cấu hình firewall...${NC}"
ufw allow 'Nginx Full' || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true

# 8. Lấy SSL certificate (chỉ lấy certificate, không tự động cập nhật Nginx)
echo -e "${YELLOW}🔐 Đang lấy SSL certificate...${NC}"
echo -e "${YELLOW}⚠️  Đảm bảo domain $DOMAIN và $API_DOMAIN đã trỏ về IP VPS trước khi tiếp tục!${NC}"
read -p "Nhấn Enter để tiếp tục hoặc Ctrl+C để hủy..."

# Reload Nginx để đảm bảo cấu hình HTTP đang chạy
systemctl reload nginx

# Kiểm tra DNS cho www subdomain (optional - chỉ thêm nếu có DNS)
WWW_DOMAIN=""
WWW_IP=$(dig +short "www.$DOMAIN" 2>/dev/null | head -n1)
if [ -n "$WWW_IP" ]; then
    WWW_DOMAIN="-d www.$DOMAIN"
    echo -e "${GREEN}✅ Tìm thấy DNS cho www.$DOMAIN, sẽ thêm vào certificate${NC}"
else
    echo -e "${YELLOW}⚠️  Không tìm thấy DNS cho www.$DOMAIN, sẽ bỏ qua (không bắt buộc)${NC}"
fi

# Lấy certificate (chỉ cho domain chính và API, www là optional)
CERTBOT_DOMAINS="-d $DOMAIN -d $API_DOMAIN"
if [ -n "$WWW_DOMAIN" ]; then
    CERTBOT_DOMAINS="$CERTBOT_DOMAINS $WWW_DOMAIN"
fi

echo -e "${YELLOW}📋 Đang lấy certificate cho: $DOMAIN, $API_DOMAIN${NC}"
[ -n "$WWW_DOMAIN" ] && echo -e "${YELLOW}   (và www.$DOMAIN)${NC}"

certbot certonly --nginx $CERTBOT_DOMAINS --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo -e "${RED}❌ Không thể lấy SSL certificate. Kiểm tra lại DNS và thử lại.${NC}"
    exit 1
}

# 8.1. Cập nhật lại cấu hình Nginx với đầy đủ settings sau khi có certificate
echo -e "${YELLOW}📝 Đang cập nhật cấu hình Nginx với SSL...${NC}"

cat > "$NGINX_CONFIG" <<EOF
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
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Frontend - HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/ptcmss-frontend-access.log;
    error_log /var/log/nginx/ptcmss-frontend-error.log;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Backend API - HTTP (redirect to HTTPS)
server {
    listen 80;
    server_name $API_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Backend API - HTTPS
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/ptcmss-backend-access.log;
    error_log /var/log/nginx/ptcmss-backend-error.log;

    add_header Access-Control-Allow-Origin "https://$DOMAIN" always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type" always;
    add_header Access-Control-Allow-Credentials "true" always;

    if (\$request_method = 'OPTIONS') {
        return 204;
    }

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        
        # Ẩn CORS headers từ backend để tránh trùng lặp (Nginx đã xử lý CORS)
        proxy_hide_header Access-Control-Allow-Origin;
        proxy_hide_header Access-Control-Allow-Methods;
        proxy_hide_header Access-Control-Allow-Headers;
        proxy_hide_header Access-Control-Allow-Credentials;
    }
}
EOF

# Kiểm tra lại cấu hình
if nginx -t; then
    echo -e "${GREEN}✅ Cấu hình Nginx với SSL hợp lệ${NC}"
else
    echo -e "${RED}❌ Cấu hình Nginx không hợp lệ${NC}"
    exit 1
fi

# 9. Reload Nginx
echo -e "${YELLOW}🔄 Đang reload Nginx...${NC}"
systemctl reload nginx

# 10. Kiểm tra auto-renewal
echo -e "${YELLOW}🔄 Đang kiểm tra auto-renewal...${NC}"
certbot renew --dry-run

echo -e "${GREEN}✅ Hoàn tất setup domain!${NC}"
echo -e "${GREEN}🌐 Frontend: https://$DOMAIN${NC}"
echo -e "${GREEN}🌐 Backend API: https://$API_DOMAIN${NC}"
echo -e "${YELLOW}📝 Nhớ cập nhật VITE_API_BASE trong docker-compose.yml thành: https://$API_DOMAIN${NC}"


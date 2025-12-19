#!/bin/bash

# Script sửa lỗi CORS PATCH method trên production server
# Sử dụng: sudo ./scripts/fix-cors-patch.sh

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

NGINX_CONFIG="/etc/nginx/sites-available/ptcmss"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo -e "${RED}❌ Không tìm thấy file cấu hình Nginx: $NGINX_CONFIG${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Đang sửa CORS config để thêm PATCH method...${NC}"

# Backup file cấu hình
cp "$NGINX_CONFIG" "$NGINX_CONFIG.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${GREEN}✅ Đã backup cấu hình cũ${NC}"

# Sửa Access-Control-Allow-Methods để thêm PATCH
sed -i 's/add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;/add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD" always;/g' "$NGINX_CONFIG"

echo -e "${GREEN}✅ Đã cập nhật Access-Control-Allow-Methods${NC}"

# Kiểm tra cấu hình
echo -e "${YELLOW}🔍 Đang kiểm tra cấu hình Nginx...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Cấu hình Nginx hợp lệ${NC}"
else
    echo -e "${RED}❌ Cấu hình Nginx không hợp lệ, đang khôi phục backup...${NC}"
    mv "$NGINX_CONFIG.backup."* "$NGINX_CONFIG"
    exit 1
fi

# Reload Nginx
echo -e "${YELLOW}🔄 Đang reload Nginx...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx đã được reload${NC}"

echo ""
echo -e "${GREEN}✅ Hoàn tất! CORS đã được sửa để hỗ trợ PATCH method.${NC}"
echo -e "${YELLOW}💡 Lỗi 'Method PATCH is not allowed' sẽ được giải quyết.${NC}"


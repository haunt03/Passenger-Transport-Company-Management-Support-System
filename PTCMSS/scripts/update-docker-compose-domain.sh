#!/bin/bash

# Script cập nhật VITE_API_BASE trong docker-compose.yml sau khi setup SSL
# Sử dụng: ./update-docker-compose-domain.sh

set -e

DOMAIN="hethongvantai.site"
API_DOMAIN="api.$DOMAIN"
COMPOSE_FILE="docker-compose.yml"

# Màu sắc
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}📝 Đang cập nhật docker-compose.yml...${NC}"

# Kiểm tra file tồn tại
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Không tìm thấy file $COMPOSE_FILE"
    exit 1
fi

# Backup file
cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup"
echo "✅ Đã backup file: ${COMPOSE_FILE}.backup"

# Cập nhật VITE_API_BASE
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|VITE_API_BASE: http://42.96.17.108:8080|VITE_API_BASE: https://$API_DOMAIN|g" "$COMPOSE_FILE"
else
    # Linux
    sed -i "s|VITE_API_BASE: http://42.96.17.108:8080|VITE_API_BASE: https://$API_DOMAIN|g" "$COMPOSE_FILE"
fi

echo -e "${GREEN}✅ Đã cập nhật VITE_API_BASE thành: https://$API_DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📋 Bước tiếp theo:${NC}"
echo "1. Commit và push code:"
echo "   git add docker-compose.yml"
echo "   git commit -m 'Update VITE_API_BASE to use domain'"
echo "   git push origin main"
echo ""
echo "2. Trên VPS, pull và rebuild:"
echo "   cd /root/PTCMSS/PTCMSS"
echo "   git pull origin main"
echo "   docker compose down"
echo "   docker compose build --no-cache frontend"
echo "   docker compose up -d"


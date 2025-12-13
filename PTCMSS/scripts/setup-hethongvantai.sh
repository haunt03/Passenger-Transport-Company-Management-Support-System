#!/bin/bash

# Script setup nhanh cho domain hethongvantai.site
# Sử dụng: sudo ./setup-hethongvantai.sh

set -e

DOMAIN="hethongvantai.site"
API_DOMAIN="api.$DOMAIN"
VPS_IP="42.96.17.108"

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Setup domain: $DOMAIN${NC}"
echo ""

# Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Vui lòng chạy với sudo${NC}"
    exit 1
fi

# Kiểm tra DNS
echo -e "${YELLOW}🔍 Đang kiểm tra DNS...${NC}"
MAIN_IP=$(dig +short $DOMAIN | head -n1)
API_IP=$(dig +short $API_DOMAIN | head -n1)

if [ -z "$MAIN_IP" ]; then
    echo -e "${RED}❌ DNS chưa propagate cho $DOMAIN${NC}"
    echo "⚠️  Đợi thêm thời gian (3-24h) và thử lại"
    exit 1
fi

if [ "$MAIN_IP" != "$VPS_IP" ]; then
    echo -e "${YELLOW}⚠️  $DOMAIN trỏ về IP khác: $MAIN_IP (VPS: $VPS_IP)${NC}"
fi

if [ -z "$API_IP" ]; then
    echo -e "${YELLOW}⚠️  Chưa có DNS cho $API_DOMAIN${NC}"
    echo "💡 Hãy thêm A record cho 'api' trỏ về $VPS_IP"
    read -p "Nhấn Enter sau khi đã thêm DNS record hoặc Ctrl+C để hủy..."
    API_IP=$(dig +short $API_DOMAIN | head -n1)
    if [ -z "$API_IP" ]; then
        echo -e "${RED}❌ Vẫn chưa thấy DNS cho $API_DOMAIN${NC}"
        exit 1
    fi
fi

if [ "$API_IP" != "$VPS_IP" ]; then
    echo -e "${YELLOW}⚠️  $API_DOMAIN trỏ về IP khác: $API_IP${NC}"
fi

echo -e "${GREEN}✅ DNS OK${NC}"
echo ""

# Chạy script setup chính
echo -e "${YELLOW}📦 Đang chạy script setup...${NC}"
cd "$(dirname "$0")/.."
./scripts/setup-domain.sh $DOMAIN

echo ""
echo -e "${GREEN}✅ Hoàn tất!${NC}"
echo -e "${GREEN}🌐 Frontend: https://$DOMAIN${NC}"
echo -e "${GREEN}🌐 Backend: https://$API_DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📝 Bước tiếp theo:${NC}"
echo "1. Cập nhật docker-compose.yml: VITE_API_BASE = https://$API_DOMAIN"
echo "2. Rebuild frontend: docker compose build --no-cache frontend"
echo "3. Restart: docker compose up -d"


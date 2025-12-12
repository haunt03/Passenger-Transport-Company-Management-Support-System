#!/bin/bash

# Script deploy tự động trên VPS
# Sử dụng: ./deploy.sh

set -e  # Dừng nếu có lỗi

echo "🚀 Bắt đầu deploy PTCMSS..."

# Đường dẫn project (có thể thay đổi)
PROJECT_DIR="${VPS_DEPLOY_PATH:-/root/PTCMSS/PTCMSS}"

# Chuyển đến thư mục project
cd "$PROJECT_DIR" || exit 1

echo "📂 Đang ở thư mục: $(pwd)"

# Pull code mới nhất
echo "📥 Đang pull code mới nhất..."
git fetch origin
git pull origin main || git pull origin master

# Dừng containers cũ
echo "🛑 Dừng containers cũ..."
docker compose down

# Build lại images
echo "🔨 Đang build images..."
docker compose build --no-cache

# Khởi động containers
echo "▶️  Khởi động containers..."
docker compose up -d

# Chờ services khởi động
echo "⏳ Đợi services khởi động..."
sleep 10

# Kiểm tra trạng thái
echo "📊 Kiểm tra trạng thái containers..."
docker compose ps

# Hiển thị logs
echo "📋 Logs gần đây:"
docker compose logs --tail=50

echo "✅ Deploy hoàn tất!"
echo "🌐 Backend: http://$(hostname -I | awk '{print $1}'):8080"
echo "🌐 Frontend: http://$(hostname -I | awk '{print $1}'):5173"
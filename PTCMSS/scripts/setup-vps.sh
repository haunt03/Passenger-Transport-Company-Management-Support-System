#!/bin/bash

# Script cài đặt môi trường cho VPS Ubuntu
# Chạy với: bash setup-vps.sh hoặc chmod +x setup-vps.sh && ./setup-vps.sh

set -e  # Dừng nếu có lỗi

echo "🚀 Bắt đầu cài đặt môi trường cho VPS..."

# Cập nhật hệ thống
echo "📦 Đang cập nhật hệ thống..."
apt update && apt upgrade -y

# Cài đặt các package cơ bản
echo "📦 Đang cài đặt các package cơ bản..."
apt install -y \
    curl \
    wget \
    git \
    vim \
    nano \
    htop \
    net-tools \
    ufw \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Cài đặt Docker
echo "🐳 Đang cài đặt Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker đã được cài đặt"
else
    echo "✅ Docker đã được cài đặt sẵn"
fi

# Cài đặt Docker Compose Plugin
echo "🐳 Đang cài đặt Docker Compose..."
if ! command -v docker compose &> /dev/null; then
    apt install -y docker-compose-plugin
    echo "✅ Docker Compose đã được cài đặt"
else
    echo "✅ Docker Compose đã được cài đặt sẵn"
fi

# Thêm user vào group docker (nếu không phải root)
if [ "$EUID" -ne 0 ]; then
    usermod -aG docker $USER
    echo "✅ Đã thêm user vào group docker"
else
    echo "ℹ️  Đang chạy với quyền root, không cần thêm vào group"
fi

# Cấu hình Firewall
echo "🔥 Đang cấu hình Firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing

# Cho phép SSH (quan trọng!)
ufw allow 22/tcp comment 'SSH'

# Cho phép các port cho ứng dụng
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw allow 8080/tcp comment 'Backend API'
ufw allow 5173/tcp comment 'Frontend'
ufw allow 3306/tcp comment 'MySQL' || true  # Chỉ nếu cần truy cập MySQL từ ngoài

echo "✅ Firewall đã được cấu hình"

# Tối ưu hóa Docker
echo "⚙️  Đang tối ưu hóa Docker..."
# Tạo thư mục cho Docker (nếu cần)
mkdir -p /etc/docker

# Khởi động Docker
systemctl start docker
systemctl enable docker

# Kiểm tra cài đặt
echo ""
echo "📊 Kiểm tra cài đặt:"
echo "===================="
echo "Docker version:"
docker --version
echo ""
echo "Docker Compose version:"
docker compose version
echo ""
echo "Git version:"
git --version
echo ""
echo "Firewall status:"
ufw status
echo ""

# Tạo thư mục cho project (tùy chọn)
echo "📁 Tạo thư mục cho project..."
mkdir -p /root/PTCMSS
echo "✅ Đã tạo thư mục /root/PTCMSS"

echo ""
echo "✅ Hoàn tất cài đặt môi trường!"
echo ""
echo "📝 Các bước tiếp theo:"
echo "1. Clone repository: cd /root && git clone <your-repo-url> PTCMSS"
echo "2. Deploy: cd PTCMSS && docker compose up -d --build"
echo "3. Xem logs: docker compose logs -f"
echo ""
echo "⚠️  Lưu ý: Nếu không phải root, bạn cần logout và login lại để áp dụng group docker"


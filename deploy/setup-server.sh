#!/bin/bash
# =============================================================================
# CutList Optimizer - Hetzner VPS Setup Script
# Run dit script op een verse Ubuntu 24.04 VPS
# =============================================================================

set -e

echo "🚀 CutList Optimizer - Server Setup"
echo "===================================="

# 1. System update
echo "📦 Systeem updaten..."
apt update && apt upgrade -y

# 2. Docker installeren
echo "🐳 Docker installeren..."
curl -fsSL https://get.docker.com | sh

# 3. Docker Compose installeren
echo "📝 Docker Compose installeren..."
apt install -y docker-compose-plugin

# 4. Firewall configureren (alleen 80 en 443)
echo "🔥 Firewall configureren..."
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

# 5. App directory aanmaken
echo "📁 App directory aanmaken..."
mkdir -p /opt/cutlist-optimizer
cd /opt/cutlist-optimizer

# 6. Docker Compose file aanmaken
echo "📝 Docker Compose configuratie..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  cutlist:
    image: ghcr.io/3bm-bouwkunde/cutlist-optimizer:latest
    container_name: cutlist-optimizer
    restart: unless-stopped
    networks:
      - web

  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - web
    depends_on:
      - cutlist

networks:
  web:

volumes:
  caddy_data:
  caddy_config:
EOF

# 7. Caddyfile aanmaken (HTTPS reverse proxy)
# VERVANG cutlist.jouwdomein.nl met je eigen domein!
cat > Caddyfile << 'EOF'
# Vervang dit met je eigen domein
# cutlist.3bm.nl {
#     reverse_proxy cutlist:80
# }

# Of gebruik alleen IP (geen HTTPS):
:80 {
    reverse_proxy cutlist:80
}
EOF

echo ""
echo "✅ Setup compleet!"
echo ""
echo "📋 Volgende stappen:"
echo "1. Upload je Docker image of bouw lokaal"
echo "2. Pas Caddyfile aan met je domein voor HTTPS"
echo "3. Run: docker compose up -d"
echo ""
echo "🌐 App bereikbaar op: http://$(curl -s ifconfig.me)"

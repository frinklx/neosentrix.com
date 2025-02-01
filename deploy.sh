#!/bin/bash

# Exit on error
set -e

# Configuration
REPO_URL="https://github.com/yourusername/neosentrix.com.git"
DEPLOY_PATH="/var/www/neosentrix.com"
NGINX_CONF="/etc/nginx/sites-available/neosentrix.com"

# Update system
echo "Updating system..."
sudo apt update
sudo apt upgrade -y

# Install dependencies if not present
echo "Installing dependencies..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install certbot for SSL if not present
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

# Setup SSL certificate (if needed)
if [ ! -f "/etc/letsencrypt/live/neosentrix.com/fullchain.pem" ]; then
    echo "Setting up SSL certificate..."
    sudo certbot --nginx -d neosentrix.com --non-interactive --agree-tos -m your-email@example.com
fi

# Deploy application
echo "Deploying application..."
if [ ! -d "$DEPLOY_PATH" ]; then
    sudo mkdir -p $DEPLOY_PATH
    sudo chown -R $USER:$USER $DEPLOY_PATH
    git clone $REPO_URL $DEPLOY_PATH
else
    cd $DEPLOY_PATH
    git pull origin main
fi

# Install dependencies and build
cd $DEPLOY_PATH
npm install
npm run build

# Setup PM2 for API server
cd $DEPLOY_PATH/api
npm install
pm2 delete neosentrix-api 2>/dev/null || true
pm2 start server.js --name neosentrix-api
pm2 save

# Configure Nginx
echo "Configuring Nginx..."
sudo cp /opt/homebrew/etc/nginx/servers/neosentrix.prod.conf $NGINX_CONF
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "Deployment complete! 🚀" 
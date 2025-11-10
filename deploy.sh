#!/bin/bash
# 南京白局非遗文化数字平台 - Linux服务器快速部署脚本

echo "=========================================="
echo "南京白局非遗文化数字平台 - 部署脚本"
echo "=========================================="
echo ""

# 检测系统类型
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "无法检测系统类型，请手动安装Nginx"
    exit 1
fi

echo "检测到系统: $OS"
echo ""

# 安装Nginx
echo "[1/6] 安装Nginx..."
if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    sudo apt update
    sudo apt install nginx -y
elif [ "$OS" == "centos" ] || [ "$OS" == "rhel" ] || [ "$OS" == "fedora" ]; then
    if command -v dnf &> /dev/null; then
        sudo dnf install nginx -y
    else
        sudo yum install nginx -y
    fi
else
    echo "不支持的系统类型，请手动安装Nginx"
    exit 1
fi

# 启动Nginx
echo "[2/6] 启动Nginx服务..."
sudo systemctl start nginx
sudo systemctl enable nginx

# 检查Nginx状态
if sudo systemctl is-active --quiet nginx; then
    echo "✓ Nginx已成功启动"
else
    echo "✗ Nginx启动失败，请检查错误信息"
    exit 1
fi

# 配置防火墙
echo "[3/6] 配置防火墙..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "✓ UFW防火墙已配置"
elif command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo "✓ Firewalld防火墙已配置"
else
    echo "⚠ 未检测到防火墙，请手动配置"
fi

# 创建项目目录
echo "[4/6] 创建项目目录..."
PROJECT_DIR="/var/www/html/baiju"
sudo mkdir -p $PROJECT_DIR

# 设置权限
echo "[5/6] 设置文件权限..."
if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    sudo chown -R www-data:www-data /var/www/html/
else
    sudo chown -R nginx:nginx /var/www/html/
fi
sudo chmod -R 755 /var/www/html/

# 配置Nginx
echo "[6/6] 配置Nginx..."
if [ "$OS" == "ubuntu" ] || [ "$OS" == "debian" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
else
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
fi

# 备份原配置
sudo cp $NGINX_CONF ${NGINX_CONF}.backup

# 创建新配置
sudo tee $NGINX_CONF > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    charset utf-8;

    access_log /var/log/nginx/baiju_access.log;
    error_log /var/log/nginx/baiju_error.log;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|mp4)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(mp4|webm|ogg)$ {
        add_header Accept-Ranges bytes;
    }
}
EOF

# 测试配置
if sudo nginx -t; then
    echo "✓ Nginx配置正确"
    sudo systemctl reload nginx
else
    echo "✗ Nginx配置有误，已恢复备份"
    sudo cp ${NGINX_CONF}.backup $NGINX_CONF
    exit 1
fi

echo ""
echo "=========================================="
echo "部署脚本执行完成！"
echo "=========================================="
echo ""
echo "接下来的步骤："
echo "1. 使用SCP上传项目文件到服务器："
echo "   scp -r * root@YOUR_SERVER_IP:/var/www/html/"
echo ""
echo "2. 或者使用FTP工具上传文件"
echo ""
echo "3. 上传完成后，在浏览器访问："
echo "   http://YOUR_SERVER_IP"
echo ""
echo "4. 如果文件在子目录，访问："
echo "   http://YOUR_SERVER_IP/baiju/"
echo ""


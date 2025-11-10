# Linux服务器部署指南

## 📋 部署前准备

### 1. 服务器要求
- ✅ Linux系统（Ubuntu 20.04+ / CentOS 7+ 推荐）
- ✅ 已配置SSH访问
- ✅ 有root或sudo权限
- ✅ 至少1GB可用磁盘空间

### 2. 本地准备
- ✅ 项目文件已整理好
- ✅ 知道服务器IP地址
- ✅ 有SSH登录凭证（用户名和密码或密钥）

---

## 🚀 部署步骤

### 第一步：连接服务器

#### Windows用户（使用PuTTY或PowerShell）
```powershell
# 使用PowerShell SSH连接
ssh root@YOUR_SERVER_IP
# 或
ssh username@YOUR_SERVER_IP
```

#### 使用PuTTY
1. 下载PuTTY：https://www.putty.org
2. 输入服务器IP
3. 点击Open
4. 输入用户名和密码

#### Mac/Linux用户
```bash
ssh root@YOUR_SERVER_IP
# 或
ssh username@YOUR_SERVER_IP
```

---

### 第二步：安装Nginx Web服务器

#### Ubuntu/Debian系统
```bash
# 更新软件包列表
sudo apt update

# 安装Nginx
sudo apt install nginx -y

# 启动Nginx服务
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查Nginx状态
sudo systemctl status nginx
```

#### CentOS/RHEL系统
```bash
# 安装Nginx
sudo yum install nginx -y
# 或（CentOS 8+）
sudo dnf install nginx -y

# 启动Nginx服务
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查Nginx状态
sudo systemctl status nginx
```

#### 验证安装
在浏览器访问：`http://YOUR_SERVER_IP`
如果看到Nginx欢迎页面，说明安装成功！

---

### 第三步：上传项目文件

#### 方法一：使用SCP命令（推荐）

**在本地Windows PowerShell或命令行执行：**
```powershell
# 进入项目文件夹
cd C:\Users\clion\Desktop\xiaotiao

# 上传所有文件到服务器（替换YOUR_SERVER_IP和用户名）
scp -r * root@YOUR_SERVER_IP:/var/www/html/

# 或者上传整个文件夹
scp -r . root@YOUR_SERVER_IP:/var/www/html/baiju
```

**Mac/Linux用户：**
```bash
cd ~/Desktop/xiaotiao
scp -r * root@YOUR_SERVER_IP:/var/www/html/
```

#### 方法二：使用FTP工具（FileZilla）

1. **下载FileZilla**
   - 访问：https://filezilla-project.org
   - 下载FileZilla Client

2. **连接服务器**
   - 主机：`sftp://YOUR_SERVER_IP`
   - 用户名：`root` 或你的用户名
   - 密码：你的服务器密码
   - 端口：`22`

3. **上传文件**
   - 左侧：本地项目文件夹
   - 右侧：服务器 `/var/www/html/` 目录
   - 选中所有文件，拖拽到右侧上传

#### 方法三：使用Git（如果服务器已安装Git）

**在服务器上执行：**
```bash
cd /var/www/html
git clone https://github.com/YOUR_USERNAME/nanjing-baiju-platform.git baiju
# 或者直接上传到html目录
git clone https://github.com/YOUR_USERNAME/nanjing-baiju-platform.git .
```

#### 方法四：使用WinSCP（Windows图形界面）

1. 下载WinSCP：https://winscp.net
2. 新建会话：
   - 文件协议：SFTP
   - 主机名：你的服务器IP
   - 用户名：root
   - 密码：你的密码
3. 连接后，拖拽文件上传

---

### 第四步：配置Nginx

#### 1. 检查文件是否上传成功
```bash
# 在服务器上执行
ls -la /var/www/html/
# 应该能看到 index.html 文件
```

#### 2. 配置Nginx虚拟主机

**Ubuntu/Debian：**
```bash
sudo nano /etc/nginx/sites-available/default
```

**CentOS/RHEL：**
```bash
sudo nano /etc/nginx/conf.d/default.conf
```

#### 3. 编辑配置文件

**如果文件在 `/var/www/html/` 根目录：**
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # 如果有域名，替换为域名
    root /var/www/html;
    index index.html;

    # 支持中文文件名
    charset utf-8;

    # 日志文件
    access_log /var/log/nginx/baiju_access.log;
    error_log /var/log/nginx/baiju_error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|mp4)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 视频文件支持
    location ~* \.(mp4|webm|ogg)$ {
        add_header Accept-Ranges bytes;
    }
}
```

**如果文件在子目录（如 `/var/www/html/baiju/`）：**
```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;
    root /var/www/html;
    index index.html;

    charset utf-8;

    location / {
        try_files $uri $uri/ =404;
    }

    location /baiju {
        alias /var/www/html/baiju;
        try_files $uri $uri/ /baiju/index.html;
    }
}
```

#### 4. 测试Nginx配置
```bash
sudo nginx -t
```
如果显示 `syntax is ok` 和 `test is successful`，说明配置正确。

#### 5. 重启Nginx
```bash
sudo systemctl restart nginx
```

---

### 第五步：配置防火墙

#### Ubuntu/Debian (UFW)
```bash
# 允许HTTP流量
sudo ufw allow 80/tcp

# 允许HTTPS流量（如果后续配置SSL）
sudo ufw allow 443/tcp

# 检查防火墙状态
sudo ufw status
```

#### CentOS/RHEL (firewalld)
```bash
# 允许HTTP
sudo firewall-cmd --permanent --add-service=http

# 允许HTTPS
sudo firewall-cmd --permanent --add-service=https

# 重载防火墙
sudo firewall-cmd --reload

# 检查状态
sudo firewall-cmd --list-all
```

#### 如果使用iptables
```bash
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables-save
```

---

### 第六步：设置文件权限

```bash
# 设置Nginx用户为文件所有者
sudo chown -R www-data:www-data /var/www/html/
# CentOS使用 nginx:nginx
sudo chown -R nginx:nginx /var/www/html/

# 设置文件权限
sudo chmod -R 755 /var/www/html/

# 确保index.html可读
sudo chmod 644 /var/www/html/index.html
```

---

### 第七步：测试访问

1. **在浏览器访问：**
   ```
   http://YOUR_SERVER_IP
   ```

2. **检查功能：**
   - ✅ 页面正常加载
   - ✅ 图片正常显示
   - ✅ 视频可以播放
   - ✅ 所有功能按钮正常

3. **如果无法访问，检查：**
   ```bash
   # 检查Nginx是否运行
   sudo systemctl status nginx
   
   # 检查端口是否监听
   sudo netstat -tlnp | grep :80
   
   # 查看Nginx错误日志
   sudo tail -f /var/log/nginx/error.log
   ```

---

## 🔒 配置HTTPS（推荐）

### 使用Let's Encrypt免费SSL证书

#### 1. 安装Certbot
```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
# 或
sudo dnf install certbot python3-certbot-nginx -y
```

#### 2. 获取SSL证书

**如果有域名：**
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**如果只有IP地址：**
- Let's Encrypt不支持IP地址，需要使用其他方式：
  - 使用Cloudflare免费SSL
  - 或使用自签名证书（浏览器会显示警告）

#### 3. 自动续期
证书会自动续期，也可以手动测试：
```bash
sudo certbot renew --dry-run
```

---

## 📝 完整部署脚本（一键部署）

创建一个部署脚本，方便后续使用：

```bash
#!/bin/bash
# 保存为 deploy.sh

echo "开始部署南京白局非遗文化数字平台..."

# 1. 安装Nginx
echo "安装Nginx..."
sudo apt update
sudo apt install nginx -y

# 2. 启动Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 3. 配置防火墙
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 4. 创建项目目录
sudo mkdir -p /var/www/html/baiju
sudo chown -R $USER:$USER /var/www/html/baiju

echo "部署脚本执行完成！"
echo "请使用SCP或FTP上传项目文件到 /var/www/html/baiju/"
echo "然后配置Nginx并重启服务"
```

使用方法：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔧 常见问题解决

### Q1: 访问显示403 Forbidden？
**解决方案：**
```bash
# 检查文件权限
sudo chmod -R 755 /var/www/html/
sudo chown -R www-data:www-data /var/www/html/

# 检查Nginx配置中的root路径是否正确
sudo nginx -t
```

### Q2: 图片或视频无法加载？
**解决方案：**
```bash
# 检查文件是否存在
ls -la /var/www/html/images/

# 检查文件权限
sudo chmod 644 /var/www/html/images/*

# 检查Nginx日志
sudo tail -f /var/log/nginx/error.log
```

### Q3: 中文文件名乱码？
**解决方案：**
在Nginx配置中添加：
```nginx
charset utf-8;
```

### Q4: 视频文件太大无法上传？
**解决方案：**
```bash
# 方法1：使用rsync（支持断点续传）
rsync -avz --progress 白局小明视频.mp4 root@YOUR_SERVER_IP:/var/www/html/

# 方法2：压缩后上传
# 在本地压缩视频，上传后再解压
```

### Q5: 如何查看访问日志？
```bash
# 实时查看访问日志
sudo tail -f /var/log/nginx/access.log

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 性能优化建议

### 1. 启用Gzip压缩
在Nginx配置中添加：
```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
```

### 2. 设置缓存
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 3. 限制请求大小
```nginx
client_max_body_size 100M;  # 允许上传最大100MB文件
```

---

## 🔄 更新网站内容

### 方法一：重新上传文件
```bash
# 在本地
scp -r * root@YOUR_SERVER_IP:/var/www/html/
```

### 方法二：使用Git（推荐）
```bash
# 在服务器上
cd /var/www/html
git pull origin main
```

### 方法三：使用rsync（高效）
```bash
# 在本地
rsync -avz --delete ./ root@YOUR_SERVER_IP:/var/www/html/
```

---

## 📱 域名配置（可选）

### 1. 添加DNS记录
在你的域名管理面板添加A记录：
```
类型: A
主机: @ 或 www
值: YOUR_SERVER_IP
TTL: 3600
```

### 2. 修改Nginx配置
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    # ... 其他配置
}
```

### 3. 重启Nginx
```bash
sudo systemctl restart nginx
```

---

## ✅ 部署检查清单

- [ ] Nginx已安装并运行
- [ ] 项目文件已上传到服务器
- [ ] Nginx配置正确
- [ ] 防火墙已开放80和443端口
- [ ] 文件权限设置正确
- [ ] 网站可以正常访问
- [ ] 图片和视频正常加载
- [ ] 所有功能正常工作
- [ ] HTTPS已配置（如果使用域名）

---

## 🎯 快速命令参考

```bash
# 启动Nginx
sudo systemctl start nginx

# 停止Nginx
sudo systemctl stop nginx

# 重启Nginx
sudo systemctl restart nginx

# 重载配置（不中断服务）
sudo systemctl reload nginx

# 查看Nginx状态
sudo systemctl status nginx

# 测试配置
sudo nginx -t

# 查看日志
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

---

## 📞 需要帮助？

如果遇到问题：
1. 检查Nginx错误日志：`sudo tail -f /var/log/nginx/error.log`
2. 检查Nginx配置：`sudo nginx -t`
3. 检查服务状态：`sudo systemctl status nginx`
4. 检查端口监听：`sudo netstat -tlnp | grep :80`

---

**部署完成后，你的网站就可以通过 `http://YOUR_SERVER_IP` 访问了！** 🎉


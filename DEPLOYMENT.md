# 部署指南 (Deployment Guide)

本指南详细说明了如何将“通用Web后台管理系统”部署到生产服务器。推荐使用Linux服务器（如Ubuntu 20.04+）并搭配Nginx和PM2进行部署。

---

## 1. 服务器环境准备

在开始部署之前，请确保你的服务器已经安装了以下软件：

- **Node.js (>= 16.x)**: JavaScript运行时。
- **NPM 或 Yarn**: 包管理工具。
- **PM2**: Node.js进程管理工具。
- **Nginx**: 高性能Web服务器，用于反向代理和负载均衡。
- **Git**: 版本控制工具。

### 1.1 安装Node.js

推荐使用`nvm`（Node Version Manager）来安装和管理Node.js版本。

```bash
# 安装nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# 使nvm生效
source ~/.bashrc

# 安装Node.js v18
nvm install 18
nvm use 18
```

### 1.2 安装PM2

PM2可以帮助你在后台持续运行Node.js应用，并在应用崩溃时自动重启。

```bash
# 使用npm全局安装PM2
npm install pm2 -g
```

### 1.3 安装Nginx

```bash
# 更新包列表并安装Nginx
sudo apt update
sudo apt install nginx -y
```

## 2. 部署步骤

### 2.1 获取代码

登录到你的服务器，并从GitHub克隆代码。

```bash
# 建议将项目放在 /var/www 目录下
cd /var/www

git clone https://github.com/xutomi3-art/tongyong-web-backend.git
cd tongyong-web-backend
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置应用

创建`data`目录，并从示例文件创建生产环境的配置文件。

```bash
mkdir data
cp data/config.example.json data/config.json
```

**务必编辑 `data/config.json` 文件**，填入你自己的API密钥、数据库信息、邮箱配置等。

### 2.4 使用PM2启动应用

```bash
# 启动应用并命名为 "tongyong-web-backend"
pm2 start index.js --name "tongyong-web-backend"

# 设置PM2开机自启
pm2 startup
# (根据提示执行返回的命令)

# 保存当前PM2进程列表
pm2 save
```

现在，你的后台服务已经在服务器上运行起来了，默认监听`3000`端口。

## 3. 配置Nginx反向代理

为了通过域名访问你的后台服务，并增加一层安全保护，需要配置Nginx作为反向代理。

### 3.1 创建Nginx配置文件

为你的后台服务创建一个新的Nginx配置文件。

```bash
# 创建并编辑配置文件
sudo nano /etc/nginx/sites-available/tongyong-web-backend.conf
```

将以下内容粘贴到文件中，并**将 `your_domain.com` 替换为你的域名**。

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000; # 将请求转发到Node.js应用
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3.2 启用配置并重启Nginx

```bash
# 创建软链接以启用该配置
sudo ln -s /etc/nginx/sites-available/tongyong-web-backend.conf /etc/nginx/sites-enabled/

# 测试Nginx配置是否有语法错误
sudo nginx -t

# 重启Nginx使配置生效
sudo systemctl restart nginx
```

现在，你可以通过 `http://your_domain.com` 来访问你的后台API了。

## 4. 配置SSL证书 (HTTPS)

为了数据传输安全，强烈建议为你的域名配置SSL证书，启用HTTPS。

推荐使用 [Certbot](https://certbot.eff.org/) 和 Let's Encrypt 来免费获取和自动续签SSL证书。

### 4.1 安装Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 4.2 获取并安装证书

```bash
# Certbot会自动修改Nginx配置并安装证书
sudo certbot --nginx -d your_domain.com
```

根据提示操作，Certbot会自动为你配置好HTTPS，并设置证书的自动续签。

## 5. 日常维护

### 5.1 更新代码

当你的GitHub仓库有更新时，登录服务器执行以下命令来更新代码。

```bash
cd /var/www/tongyong-web-backend

# 拉取最新代码
git pull origin main

# 重新安装依赖（如果package.json有变动）
npm install

# 重启应用
pm2 restart tongyong-web-backend
```

### 5.2 查看日志

```bash
# 实时查看日志
pm2 logs tongyong-web-backend

# 查看完整的日志文件
pm2 logs tongyong-web-backend --lines 1000
```

### 5.3 监控应用

```bash
# 查看所有应用的状态
pm2 list

# 查看特定应用的详细信息
pm2 show tongyong-web-backend
```

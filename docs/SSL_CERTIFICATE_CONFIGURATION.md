# SSL证书管理配置指南

**文档版本**: 1.0  
**最后更新**: 2026-02-25  
**适用项目**: tongyong-web-backend

---

## 📋 概述

本文档说明SSL证书管理功能的配置要点，供未来的开发者和智能体参考。

---

## 🔑 核心配置要点

### 1. 域名配置

**重要提示**: SSL证书管理功能会自动检测域名，但在部署新项目时需要注意以下几点：

#### 自动检测机制

系统会按以下顺序确定域名：

1. **环境变量** (优先级最高)
   ```bash
   export DOMAIN=your-domain.com
   ```

2. **自动检测** (从Let's Encrypt证书目录)
   - 扫描 `/etc/letsencrypt/live/` 目录
   - 使用第一个找到的域名
   - 排除 `README` 文件

3. **默认值** (兜底)
   - 如果以上都失败，使用 `localhost`
   - 显示"未安装证书"

#### 为新项目配置域名

**方法1: 设置环境变量（推荐）**

在服务器上设置环境变量：

```bash
# 编辑 PM2 生态系统文件
nano /var/www/your-project/ecosystem.config.js

# 添加环境变量
module.exports = {
  apps: [{
    name: 'your-backend',
    script: './index.js',
    env: {
      NODE_ENV: 'production',
      DOMAIN: 'your-domain.com',  // ← 在这里设置实际域名
      PORT: 3000
    }
  }]
};

# 重启服务
pm2 restart your-backend --update-env
```

**方法2: 修改代码（不推荐）**

如果确实需要硬编码域名：

```javascript
// cert-manager.js 第14行
let domain = process.env.DOMAIN || 'your-domain.com'; // 修改默认值
```

**方法3: 依赖自动检测（推荐）**

如果已经使用Let's Encrypt申请了证书，系统会自动检测，无需额外配置。

---

### 2. 证书路径

系统默认使用Let's Encrypt标准路径：

```
/etc/letsencrypt/live/{domain}/
├── cert.pem       # 证书文件
├── chain.pem      # 证书链
├── fullchain.pem  # 完整证书链
└── privkey.pem    # 私钥
```

**如果使用其他证书提供商：**

需要修改 `cert-manager.js` 中的路径：

```javascript
// cert-manager.js 第42行
const certPath = `/path/to/your/cert/${domain}/cert.pem`;
```

---

### 3. 自动续订配置

#### Cron任务设置

自动续订功能会创建以下cron任务：

```bash
# 每天凌晨2点检查并续订证书
0 2 * * * certbot renew --quiet && systemctl reload nginx
```

#### 手动检查cron任务

```bash
# 查看当前用户的cron任务
crontab -l

# 查看root用户的cron任务
sudo crontab -l
```

#### 手动添加cron任务

如果自动续订功能无法添加cron任务，可以手动添加：

```bash
# 编辑crontab
sudo crontab -e

# 添加以下行
0 2 * * * certbot renew --quiet && systemctl reload nginx
```

---

## 🚀 部署新项目时的配置步骤

### 步骤1: 申请SSL证书

```bash
# 安装Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 申请证书（替换为实际域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 测试自动续订
sudo certbot renew --dry-run
```

### 步骤2: 配置Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 其他配置...
}
```

### 步骤3: 配置后端环境变量

```bash
# 方法1: 在PM2配置中设置
cd /var/www/your-project
nano ecosystem.config.js

# 方法2: 在.env文件中设置
echo "DOMAIN=your-domain.com" >> .env

# 方法3: 在系统环境变量中设置
echo "export DOMAIN=your-domain.com" >> ~/.bashrc
source ~/.bashrc
```

### 步骤4: 重启后端服务

```bash
pm2 restart your-backend --update-env
```

### 步骤5: 验证配置

访问后台管理面板：
```
https://your-domain.com/backend/admin.html
```

进入"系统配置" → "SSL证书管理"，检查：
- ✅ 域名显示正确
- ✅ 到期时间正确
- ✅ 剩余天数正确
- ✅ 自动续订状态正确

---

## 🔍 故障排查

### 问题1: 域名显示为"localhost"

**原因：**
- 环境变量`DOMAIN`未设置
- `/etc/letsencrypt/live/`目录为空或无权限访问

**解决方案：**
```bash
# 检查证书目录
sudo ls -la /etc/letsencrypt/live/

# 设置环境变量
export DOMAIN=your-domain.com

# 重启服务
pm2 restart your-backend --update-env
```

### 问题2: 显示"未安装证书"

**原因：**
- 证书文件不存在
- 证书路径不正确
- 没有读取权限

**解决方案：**
```bash
# 检查证书文件
sudo ls -la /etc/letsencrypt/live/your-domain.com/

# 检查文件权限
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/archive/

# 确保Node.js进程有权限读取
# 方法1: 将Node.js用户添加到ssl-cert组
sudo usermod -a -G ssl-cert $USER

# 方法2: 使用root权限运行（不推荐）
sudo pm2 start ecosystem.config.js
```

### 问题3: 自动续订开关无法切换

**原因：**
- Node.js进程没有权限修改crontab
- crontab命令不可用

**解决方案：**
```bash
# 检查crontab是否可用
which crontab

# 给Node.js进程sudo权限（仅用于crontab）
sudo visudo

# 添加以下行（替换为实际用户）
your-user ALL=(ALL) NOPASSWD: /usr/bin/crontab

# 或者手动管理cron任务
sudo crontab -e
```

### 问题4: 证书到期时间不准确

**原因：**
- 证书文件已更新，但页面未刷新
- openssl命令输出格式变化

**解决方案：**
```bash
# 手动检查证书到期时间
sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/your-domain.com/cert.pem

# 刷新浏览器页面（Ctrl+Shift+R）

# 检查cert-manager.js中的日期解析逻辑
```

---

## 📝 代码参考

### cert-manager.js 关键代码

```javascript
async function getSSLStatus() {
  try {
    // 自动检测域名：从 /etc/letsencrypt/live/ 目录中查找
    let domain = process.env.DOMAIN;
    
    if (!domain) {
      try {
        const { stdout } = await execPromise('ls /etc/letsencrypt/live/ | grep -v README');
        const domains = stdout.trim().split('\n').filter(d => d && d !== 'README');
        if (domains.length > 0) {
          domain = domains[0]; // 使用第一个找到的域名
        }
      } catch (e) {
        domain = 'localhost';
      }
    }
    
    if (!domain || domain === 'localhost') {
      return {
        success: true,
        data: {
          domain: 'localhost',
          expiry: '未安装证书',
          daysLeft: 0,
          autoRenew: false
        }
      };
    }
    
    // 检查证书文件
    const certPath = `/etc/letsencrypt/live/${domain}/cert.pem`;
    await fs.access(certPath);
    
    // 获取证书到期时间
    const { stdout } = await execPromise(`openssl x509 -enddate -noout -in ${certPath}`);
    const expiryMatch = stdout.match(/notAfter=(.+)/);
    
    if (expiryMatch) {
      const expiryDate = new Date(expiryMatch[1]);
      const now = new Date();
      const daysLeft = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      return {
        success: true,
        data: {
          domain: domain,
          expiry: expiryDate.toLocaleString('zh-CN'),
          daysLeft: daysLeft,
          autoRenew: await checkAutoRenewStatus()
        }
      };
    }
  } catch (error) {
    console.error('Get SSL status error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
```

---

## 🎯 最佳实践

### 1. 使用环境变量

**推荐做法：**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'backend',
    script: './index.js',
    env: {
      DOMAIN: 'production-domain.com',
      NODE_ENV: 'production'
    },
    env_development: {
      DOMAIN: 'dev-domain.com',
      NODE_ENV: 'development'
    }
  }]
};
```

### 2. 多域名支持

如果需要管理多个域名的证书：

```javascript
// cert-manager.js
async function getAllSSLStatus() {
  const { stdout } = await execPromise('ls /etc/letsencrypt/live/ | grep -v README');
  const domains = stdout.trim().split('\n').filter(d => d && d !== 'README');
  
  const results = await Promise.all(
    domains.map(domain => getSSLStatusForDomain(domain))
  );
  
  return results;
}
```

### 3. 证书监控告警

建议添加证书到期监控：

```javascript
// 在getSSLStatus中添加
if (daysLeft < 7) {
  // 发送紧急告警邮件
  await sendAlertEmail('SSL证书即将到期', `${domain}的证书将在${daysLeft}天后到期`);
} else if (daysLeft < 30) {
  // 发送提醒邮件
  await sendReminderEmail('SSL证书到期提醒', `${domain}的证书将在${daysLeft}天后到期`);
}
```

### 4. 备份证书

定期备份证书文件：

```bash
#!/bin/bash
# backup-certs.sh

BACKUP_DIR="/backup/ssl-certs"
DATE=$(date +%Y%m%d)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/letsencrypt-$DATE.tar.gz /etc/letsencrypt/

# 保留最近30天的备份
find $BACKUP_DIR -name "letsencrypt-*.tar.gz" -mtime +30 -delete
```

---

## 📚 相关文档

- [Let's Encrypt官方文档](https://letsencrypt.org/docs/)
- [Certbot用户指南](https://certbot.eff.org/docs/)
- [Nginx SSL配置](https://nginx.org/en/docs/http/configuring_https_servers.html)

---

## 🔄 更新日志

### v1.0 (2026-02-25)
- 初始版本
- 添加自动域名检测功能
- 添加故障排查指南
- 添加部署配置步骤

---

## 💡 给未来智能体的提示

当你需要为新项目配置SSL证书管理时：

1. **首先检查**: 项目是否已经有SSL证书（检查`/etc/letsencrypt/live/`目录）
2. **确认域名**: 从项目配置、nginx配置或环境变量中确认实际域名
3. **设置环境变量**: 在PM2配置中设置`DOMAIN`环境变量
4. **验证功能**: 访问后台管理面板，确认SSL证书信息显示正确
5. **启用自动续订**: 确保自动续订功能已启用

**关键点：**
- ⚠️ 不要硬编码域名，使用环境变量
- ⚠️ 确保Node.js进程有权限读取证书文件
- ⚠️ 测试自动续订功能是否正常工作
- ⚠️ 设置证书到期监控和告警

---

**文档维护者**: Manus AI  
**联系方式**: GitHub Issues

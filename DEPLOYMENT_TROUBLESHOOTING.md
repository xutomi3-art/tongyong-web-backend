# 部署故障排除指南

本文档记录了在部署过程中可能遇到的常见问题及其解决方案。

## 🚨 前端路由冲突问题

### 问题描述

如果您的前端是一个 **React/Vue 等单页应用（SPA）**，其路由系统可能会拦截所有请求，导致后台管理系统的路径（如 `/admin/login.html`）无法正常访问，被重定向到前端首页。

### 症状

- 访问 `/admin/login.html` 时被重定向到网站首页
- 浏览器控制台没有404错误，但页面内容不正确
- 直接访问后端API（如 `/api/admin/config`）正常工作

### 原因

前端SPA的路由配置通常会捕获所有路径，包括：
```javascript
// React Router 示例
<Route path="*" element={<NotFound />} />

// Vue Router 示例
{ path: '/:pathMatch(.*)*', component: NotFound }
```

这导致 Nginx 将请求转发给前端后，前端路由拦截了 `/admin/*` 路径。

### 解决方案

#### 方案1：使用不同的路径（推荐）

将后台管理系统部署到一个前端不会使用的路径，例如 `/backend/`：

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 后台管理系统（优先级最高，放在最前面）
    location /backend/ {
        alias /var/www/your-project/server/frontend/;
        try_files $uri $uri/ =404;
        
        # 确保HTML文件正确返回
        location ~ \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 前端应用（放在最后）
    location / {
        root /var/www/your-project/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**重要提示：**
- `location /backend/` 必须放在 `location /` **之前**
- 修改配置后需要更新前端登录页面的重定向路径

#### 方案2：在前端路由中排除管理路径

如果必须使用 `/admin/` 路径，需要修改前端路由配置：

**React Router 示例：**
```javascript
// 在路由配置前添加检查
if (window.location.pathname.startsWith('/admin/')) {
  // 不初始化React Router，让浏览器直接加载静态文件
  return;
}
```

**Vue Router 示例：**
```javascript
const router = createRouter({
  routes: [
    // 确保不包含 /admin/* 的路由
  ]
});

// 或者在路由守卫中处理
router.beforeEach((to, from, next) => {
  if (to.path.startsWith('/admin/')) {
    window.location.href = to.path;
    return;
  }
  next();
});
```

### 验证修复

修复后，测试以下URL应该正常工作：
- `https://your-domain.com/backend/login.html` - 后台登录页面
- `https://your-domain.com/backend/admin.html` - 后台管理页面
- `https://your-domain.com/api/admin/config` - API端点

## 🔧 配置文件结构变更

### 问题描述

如果您从旧版本升级，配置文件结构已从扁平结构改为嵌套结构。

### 旧结构（已弃用）
```json
{
  "email": "admin@example.com",
  "smtpHost": "smtp.163.com",
  "smtpPort": 465,
  ...
}
```

### 新结构（当前版本）
```json
{
  "brandConfig": {
    "name": "您的品牌名称",
    "description": "产品描述",
    "adminTitle": "管理后台",
    "emailSubjectPrefix": "[品牌] ",
    "websiteUrl": "https://your-domain.com"
  },
  "emailConfig": {
    "adminEmail": "admin@example.com",
    "host": "smtp.163.com",
    "port": 465,
    ...
  },
  ...
}
```

### 迁移步骤

1. 备份现有配置文件：
   ```bash
   cp data/config.json data/config.json.backup
   ```

2. 使用 `data/config.example.json` 作为模板

3. 手动迁移配置值到新结构

4. 重启服务

## 📧 邮件发送失败

### 常见原因

1. **SMTP密码错误**：某些邮件服务商需要使用"应用专用密码"而不是登录密码
2. **端口配置错误**：
   - 465端口：SSL加密，`secure: true`
   - 587端口：TLS加密，`secure: false`
3. **防火墙阻止**：检查服务器出站端口是否开放

### 解决方案

在后台管理系统的"留言配置"中测试SMTP连接，根据错误信息调整配置。

## 🔐 登录后立即退出

### 原因

JWT token配置问题或cookie域名不匹配。

### 解决方案

检查 `brandConfig.websiteUrl` 是否与实际访问域名一致。

## 📝 更多问题？

如果遇到本文档未涵盖的问题，请：
1. 检查浏览器控制台的错误信息
2. 查看服务器日志：`pm2 logs your-app-name`
3. 在GitHub Issues中搜索或提交新问题

---

**最后更新：** 2026-02-25

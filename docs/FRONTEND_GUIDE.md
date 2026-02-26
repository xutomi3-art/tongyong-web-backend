# 前端对接指南 (Frontend Integration Guide)

本文档为新前端项目对接通用Web后端提供了完整的指南和最佳实践。

---

## 🚀 快速开始

### 1. 获取后端代码

```bash
git clone https://github.com/xutomi3-art/tongyong-web-backend.git
cd tongyong-web-backend
```

### 2. 配置环境变量

复制 `.env.example` 文件为 `.env`，并填写必要的配置：

```bash
cp .env.example .env
```

**必需配置**:
```bash
# .env
PORT=3001
NODE_ENV=development
JWT_SECRET="$(openssl rand -base64 32)" # 生成一个随机密钥

# SMTP邮件配置 (联系表单需要)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@example.com
```

### 3. 安装依赖并启动

```bash
npm install
npm run dev
```

后端将在 `http://localhost:3001` 启动。

### 4. 前端代理配置

为了避免CORS问题，建议在前端开发服务器中配置代理。

**Vite示例 (`vite.config.js`)**:
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}
```

**Next.js示例 (`next.config.js`)**:
```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ]
  }
}
```

---

## 🔑 认证流程

### 1. 公开接口

以下接口无需认证即可访问：

| 方法 | 路径 | 描述 |
|------|------------|----------------|
| GET | /api/captcha | 获取图形验证码 |
| POST | /api/contact | 提交联系表单 |
| GET | /api/articles | 获取已发布的文章 |

### 2. 管理员认证

#### 步骤1: 登录

向 `/api/admin/login` 发送POST请求，获取JWT Token。

```javascript
const response = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});

const { token } = await response.json();

// 将Token保存到localStorage或Cookie
localStorage.setItem('authToken', token);
```

#### 步骤2: 发送认证请求

在所有需要认证的请求头中添加 `Authorization` 字段。

```javascript
const token = localStorage.getItem('authToken');

const response = await fetch('/api/admin/config', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

#### 步骤3: 验证Token有效性

在前端应用启动时，可以调用 `/api/admin/verify` 接口验证Token是否仍然有效。

```javascript
const token = localStorage.getItem('authToken');

if (token) {
  const response = await fetch('/api/admin/verify', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    // Token无效或过期，清除Token并跳转到登录页
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  }
}
```

### 3. 客户端SDK (推荐)

为了简化API调用和类型安全，强烈建议使用我们提供的客户端SDK。

**位置**: `docs/client-sdk.ts`

**使用示例**:
```typescript
import { ApiClient } from './client-sdk';

const client = new ApiClient('/api'); // 使用相对路径以利用代理

// 登录
await client.login('admin', 'password');

// 获取配置 (自动处理Token)
const config = await client.getConfig();

// 提交联系表单
await client.submitContactForm({
  name: '张三',
  phone: '13800138000',
  email: 'test@example.com',
  captchaId: 'uuid',
  captchaText: 'ABCD'
});
```

---

## 📝 API参考

完整的API文档请参考：
- **[API.md](./API.md)** - 所有接口的详细说明
- **[api.ts](../types/api.ts)** - 所有API的TypeScript类型定义

### 关键接口摘要

| 接口 | 描述 | 认证 |
|--------------------------------|--------------------|------|
| `GET /api/captcha` | 获取验证码 | 否 |
| `POST /api/contact` | 提交联系表单 | 否 |
| `GET /api/articles` | 获取文章列表 | 否 |
| `POST /api/admin/login` | 管理员登录 | 否 |
| `GET /api/admin/verify` | 验证Token | 是 |
| `GET /api/admin/config` | 获取系统配置 | 是 |
| `POST /api/admin/config` | 更新系统配置 | 是 |
| `POST /api/admin/change-password` | 修改密码 | 是 |
| `GET /api/admin/articles` | 获取所有文章 | 是 |
| `DELETE /api/admin/articles/:id` | 删除文章 | 是 |

---

## 🚨 安全注意事项

### 1. CORS配置

生产环境中，后端必须配置严格的CORS白名单，只允许你的前端域名访问。

```javascript
// index.js
app.use(cors({
  origin: 'https://your-frontend-domain.com'
}));
```

### 2. JWT Token存储

- **推荐**: 将Token存储在 `HttpOnly`、`Secure`、`SameSite=Strict` 的Cookie中，可以有效防止XSS攻击。
- **备选**: 存储在 `localStorage` 中，但需要做好XSS防护。

### 3. 环境变量

- **绝对不要**将 `.env` 文件提交到Git仓库。
- **绝对不要**在前端代码中硬编码任何密钥。

### 4. 请求频率限制

后端已对关键接口（如登录、验证码）添加了频率限制。前端应在用户界面上给出相应的提示（如“操作过于频繁，请稍后再试”）。

---

## 💡 最佳实践

### 1. 统一错误处理

在前端创建一个统一的API请求函数，用于处理错误和Token刷新。

```javascript
async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    // Token过期，跳转到登录页
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('认证失败');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '请求失败');
  }

  return response.json();
}
```

### 2. 使用TypeScript类型

导入后端提供的类型定义，确保前后端数据结构一致。

```typescript
import type { ContactFormRequest, Article } from '../types/api';

const newArticle: Article = {
  // ... IDE会自动提示字段
};
```

### 3. 优化用户体验

- 在API请求期间显示加载状态。
- 对用户的输入进行前端验证，减轻后端压力。
- 清晰地显示API返回的错误信息。

---

## ❓ 常见问题 (FAQ)

**Q: 为什么会出现CORS错误？**

A: 1. 检查前端代理是否配置正确。 2. 检查后端CORS白名单是否包含了你的前端域名。 3. 检查请求的URL和端口是否正确。

**Q: 为什么登录后很快就自动退出了？**

A: 可能是JWT Token过期时间设置得太短。联系后端开发人员调整 `JWT_SECRET` 和过期时间。

**Q: 为什么联系表单提交失败？**

A: 1. 检查验证码ID和文本是否正确发送。 2. 检查后端SMTP配置是否正确。 3. 检查网络请求的Body是否为正确的JSON格式。

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-26

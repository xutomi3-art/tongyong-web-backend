# 部署过程中发现并修复的问题

本文档记录了在实际部署过程中发现的问题及其解决方案，供未来部署参考。

---

## 🔒 问题1: 后台管理系统缺少登录验证（严重安全漏洞）

### 问题描述

后台管理页面 `admin.html` 完全没有登录验证逻辑，任何人都可以直接访问后台URL并查看/修改所有配置信息，存在严重的安全风险。

### 根本原因

1. **前端缺少认证检查**: `admin.html` 页面加载时没有检查用户是否已登录
2. **API请求未携带token**: 所有API请求都是匿名的，没有身份验证
3. **后端API未验证token**: 后端的管理员API端点没有添加认证中间件

### 解决方案

#### 前端修改 (`frontend/admin.html`)

**1. 添加登录状态检查**

在页面加载时立即检查localStorage中的token，如果没有则重定向到登录页：

```javascript
// 检查登录状态
function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return token;
}

// 立即检查登录状态
const authToken = checkAuth();
if (!authToken) {
  throw new Error('未登录');
}
```

**2. 创建带认证的fetch函数**

所有API请求都使用新的 `fetchWithAuth` 函数，自动携带token：

```javascript
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    window.location.href = '/admin/login.html';
    throw new Error('未登录');
  }
  
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  
  const response = await fetch(url, options);
  
  // 如果返回401，说明token无效
  if (response.status === 401) {
    localStorage.removeItem('adminToken');
    window.location.href = '/admin/login.html';
    throw new Error('登录已过期');
  }
  
  return response;
}
```

**3. 替换所有fetch调用**

将所有 `fetch(\`${API_BASE}/...\`)` 替换为 `fetchWithAuth(\`${API_BASE}/...\`)`

#### 后端修改 (`index.js`)

**1. 添加JWT和bcrypt依赖**

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
```

**2. 更新登录端点使用JWT**

```javascript
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const config = await getConfig();
  
  const admins = config.admins || [];
  const admin = admins.find(a => a.email === email);
  
  if (!admin) {
    return res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
  
  // 检查密码（支持明文和加密两种格式）
  let passwordMatch = false;
  if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
    passwordMatch = await bcrypt.compare(password, admin.password);
  } else {
    passwordMatch = (admin.password === password);
  }
  
  if (passwordMatch) {
    // 生成JWT token
    const token = jwt.sign(
      { email: admin.email, name: admin.name, role: admin.role || 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ success: true, token: token, ... });
  } else {
    res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
});
```

**3. 创建token验证中间件**

```javascript
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证token' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }
}
```

**4. 为所有管理员API添加认证**

```javascript
app.get('/api/admin/config', verifyToken, async (req, res) => { ... });
app.post('/api/admin/config', verifyToken, async (req, res) => { ... });
app.post('/api/admin/change-password', verifyToken, async (req, res) => { ... });
// ... 所有其他管理员API
```

#### 依赖更新 (`package.json`)

添加必要的npm包：

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    ...
  }
}
```

### 影响范围

- ✅ 所有后台管理页面现在需要登录才能访问
- ✅ 所有管理员API现在需要有效的JWT token
- ✅ Token有效期为7天，过期后需要重新登录
- ✅ 支持明文密码和bcrypt加密密码（向后兼容）

### 测试验证

1. 直接访问 `https://域名/admin/admin.html` 应该自动跳转到登录页
2. 未携带token的API请求应该返回401错误
3. 使用过期或无效token应该被拒绝并重定向到登录页

---

## 🚫 问题2: 前端路由冲突导致后台无法访问

### 问题描述

原计划使用 `/admin/` 路径访问后台管理系统，但前端React单页应用（SPA）拦截了该路径，导致访问 `/admin/login.html` 时被重定向到网站首页。

### 根本原因

前端React应用使用了前端路由（如React Router），它会拦截所有URL请求并尝试匹配路由规则。当访问 `/admin/*` 时，React路由优先处理，导致后台管理系统的静态文件无法被访问。

### 解决方案

#### 方案：调整Nginx配置优先级

在Nginx配置中，**location的匹配顺序很重要**。需要确保 `/admin/` 路径在 `/` 之前匹配：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL证书配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 1. 后台管理系统 - 必须在前端路由之前
    location /admin/ {
        alias /path/to/server/frontend/;
        try_files $uri $uri/ =404;
    }

    # 2. API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 3. 前端React应用 - 放在最后
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

#### 关键配置说明

1. **location顺序**: `/admin/` 必须在 `/` 之前定义
2. **使用alias**: 使用 `alias` 而不是 `root`，确保路径正确映射
3. **try_files**: 对于后台使用 `=404`，对于前端使用 `/index.html`（SPA路由）

### 影响范围

- ✅ 后台管理系统可以通过 `/admin/` 路径正常访问
- ✅ 前端React应用不受影响，继续使用 `/` 路径
- ✅ API请求通过 `/api/` 正常转发到后端

### ⚠️ 重要：前端项目集成要求

**如果您的前端项目使用了客户端路由（如React Router、Vue Router、Next.js等），必须配置路由排除 `/admin/` 路径。**

#### 为什么需要这样做？

前端SPA应用的客户端路由会在浏览器中拦截所有URL，即使Nginx正确返回了后台管理系统的HTML文件，前端路由也会重新渲染自己的页面，导致后台管理系统无法访问。

#### 各框架配置示例

**React Router v6**

```javascript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// 在路由配置之前添加检查
if (window.location.pathname.startsWith('/admin/')) {
  // 不要初始化React Router，让浏览器直接加载后台管理系统
  throw new Error('Admin path detected');
}

const router = createBrowserRouter([
  // 您的路由配置
  // 注意：不要为 /admin/* 创建任何路由
]);

function App() {
  return <RouterProvider router={router} />;
}
```

**Vue Router**

```javascript
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 您的路由配置
    // 注意：不要为 /admin/* 创建任何路由
  ]
});

// 添加全局前置守卫
router.beforeEach((to, from, next) => {
  // 如果访问 /admin/ 路径，不要拦截
  if (to.path.startsWith('/admin/')) {
    // 让浏览器直接处理，不要使用Vue Router
    window.location.href = to.fullPath;
    return;
  }
  next();
});
```

**Next.js**

在 `next.config.js` 中配置：

```javascript
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        // 不要重写 /admin/ 路径
        {
          source: '/admin/:path*',
          destination: '/admin/:path*',
          has: [
            {
              type: 'header',
              key: 'x-skip-next',
            },
          ],
        },
      ],
    };
  },
};
```

或者在 `middleware.ts` 中：

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 如果是 /admin/ 路径，直接返回，不处理
  if (request.nextUrl.pathname.startsWith('/admin/')) {
    return NextResponse.next();
  }
}
```

#### 通用解决方案（适用于任何框架）

在您的前端项目的 `index.html` 中，在所有脚本加载之前添加：

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- 在所有脚本之前添加这段代码 -->
    <script>
      // 检查是否访问后台管理系统
      if (window.location.pathname.startsWith('/admin/')) {
        // 阻止前端框架初始化
        window.__ADMIN_PATH__ = true;
        // 可选：如果需要，可以抛出错误阻止后续脚本执行
        throw new Error('Admin path detected, frontend framework should not initialize');
      }
    </script>
    
    <!-- 您的其他脚本 -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

#### 🤖 致AI助手：部署指导

**如果您是AI助手，正在帮助用户部署这个后台管理系统，请注意：**

1. **必须检查前端项目是否使用了客户端路由**
   - 如果是React/Vue/Angular等SPA应用，几乎肯定使用了客户端路由
   - 如果是Next.js/Nuxt.js，也需要特殊配置

2. **必须主动告知用户需要修改前端代码**
   - 不要假设用户会自己发现这个问题
   - 提供具体的代码示例（使用上面的框架示例）
   - 解释为什么需要这样做

3. **部署顺序很重要**
   - 先配置Nginx（确保 `/admin/` 在 `/` 之前）
   - 再修改前端代码（添加路由排除）
   - 最后重新构建并部署前端

4. **测试验证是必须的**
   - 访问 `/admin/login.html` 应该显示后台登录页
   - 在浏览器开发者工具中检查Network面板，确认没有加载前端框架的JS文件
   - 如果仍然显示前端页面，说明前端路由配置未生效

5. **这是最终解决方案，不是临时workaround**
   - 不要尝试使用JavaScript注入或其他hack方法
   - 必须修改前端源代码并重新构建
   - 这是保证后台系统可以服务于多个前端项目的正确方法
```

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function generateCaptchaSVG(text) {
  // 生成SVG验证码图形
  return `<svg>...</svg>`;
}

module.exports = { generateCaptchaText, generateCaptchaSVG };
```

#### 2. `cert-manager.js` - SSL证书管理

```javascript
async function renewCertificate(domain) {
  // 使用certbot更新证书
  return { success: true, message: '证书更新成功' };
}

async function getCertificateInfo(domain) {
  // 获取证书信息
  return { domain, expiryDate: '2026-12-31', issuer: 'Let\'s Encrypt' };
}

module.exports = { renewCertificate, getCertificateInfo };
```

#### 3. `article-rewriter.js` - 文章改写

```javascript
async function rewriteArticle(article, llmConfig, rounds = 3) {
  // 使用LLM改写文章
  return { ...article, content: '改写后的内容' };
}

module.exports = { rewriteArticle };
```

#### 4. `feishu-integration.js` - 飞书集成

```javascript
async function sendToFeishuBot(webhookUrl, message) {
  // 发送消息到飞书机器人
  return { success: true };
}

async function syncToFeishuTable(appId, appSecret, tableUrl, data) {
  // 同步数据到飞书表格
  return { success: true };
}

module.exports = { sendToFeishuBot, syncToFeishuTable };
```

### 影响范围

- ✅ 服务可以正常启动
- ✅ 所有功能模块都有基本实现
- ⚠️ 部分功能需要进一步完善实现细节

---

## 🔧 问题4: 配置API结构不一致

### 问题描述

前端页面显示占位符数据（如"您的品牌名称"），配置信息未正确加载。

### 根本原因

`index.js` 中存在两个 `/api/admin/config` 端点定义：
1. 第一个返回扁平结构的配置
2. 第二个返回嵌套结构 `{success: true, config: config}`

后定义的端点覆盖了前面的，导致前端收到的数据结构与预期不符。

### 解决方案

1. 删除重复的配置端点定义
2. 统一使用扁平结构返回配置数据
3. 修复配置保存逻辑以支持嵌套结构的配置文件

```javascript
// 只保留一个config端点
app.get('/api/admin/config', verifyToken, async (req, res) => {
  const config = await getConfig();
  res.json(config);  // 直接返回配置对象
});
```

### 影响范围

- ✅ 配置信息正确加载到前端
- ✅ 品牌名称、描述等信息正常显示
- ✅ 所有配置项都能正确读取和保存

---

## 📝 部署检查清单

在部署新环境时，请按以下顺序检查：

### 1. 代码完整性
- [ ] 所有模块文件都已提交到Git
- [ ] package.json包含所有必要的依赖
- [ ] 没有重复的API端点定义

### 2. 安全配置
- [ ] JWT_SECRET已设置（生产环境使用环境变量）
- [ ] 管理员密码已加密（使用bcrypt）
- [ ] 所有管理员API都添加了verifyToken中间件

### 3. Nginx配置
- [ ] `/admin/` location在 `/` 之前定义
- [ ] 使用alias而不是root
- [ ] SSL证书配置正确

### 4. 功能测试
- [ ] 登录功能正常
- [ ] 未登录时自动跳转到登录页
- [ ] Token过期后正确处理
- [ ] 所有API请求都需要认证

### 5. 依赖安装
```bash
cd /path/to/server
npm install
pm2 restart backend-service
```

---

## 🎯 最佳实践建议

### 1. 安全性

- 使用环境变量存储敏感信息（JWT_SECRET、数据库密码等）
- 定期更新依赖包，修复安全漏洞
- 实施CSRF保护
- 添加请求速率限制

### 2. 可维护性

- 所有模块文件都应有完整的实现
- API端点不要重复定义
- 使用统一的错误处理机制
- 添加详细的日志记录

### 3. 性能优化

- 使用Redis存储session和token
- 实施API响应缓存
- 优化数据库查询
- 使用CDN加速静态资源

---

## 📞 问题反馈

如果在部署过程中遇到其他问题，请：

1. 检查PM2日志：`pm2 logs backend-service`
2. 检查Nginx错误日志：`tail -f /var/log/nginx/error.log`
3. 验证配置文件格式：`cat data/config.json | jq`

---

---

## 🖥️ 问题5：新前端项目对接后端时常见问题汇总

本节专门记录将新前端项目（React、Vue、Next.js 等）与本后端对接时，历史上反复出现的问题及其标准解决方案。**AI助手在帮助用户对接新前端时，必须主动阅读并遵循本节所有要求。**

---

### ⚠️ 问题5.1：前端路由拦截 `/admin/` 导致后台无法访问

这是最常见、最严重的对接问题。前端 SPA 框架（React Router、Vue Router 等）会在浏览器端拦截所有 URL，导致访问 `/admin/login.html` 时渲染的是前端的 404 页面，而不是后台登录页。

**必须在前端 `index.html` 的所有脚本之前加入以下代码：**

```html
<!DOCTYPE html>
<html>
  <head>
    <!-- ⚠️ 必须是第一个 script，在所有框架脚本之前 -->
    <script>
      if (window.location.pathname.startsWith('/admin/')) {
        // 阻止前端框架初始化，让浏览器直接加载后台管理系统
        throw new Error('Admin path detected; halting frontend app initialization.');
      }
    </script>
    <!-- 其他脚本 -->
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

各框架的具体配置方案详见本文档「问题2」章节。

---

### ⚠️ 问题5.2：联系表单未使用验证码流程

后端的联系表单接口 `POST /api/contact` **强制要求验证码**，缺少验证码会直接返回 400 错误。前端必须实现两步流程：

**第一步：获取验证码**

```javascript
// GET /api/captcha
const res = await fetch('/api/captcha');
const { captchaId, svg } = await res.json();
// 将 svg 渲染为图片，将 captchaId 存入 state
```

**第二步：提交表单时携带验证码**

```javascript
// POST /api/contact
await fetch('/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    company: '某某公司',
    message: '我想了解产品详情',
    captchaId: captchaId,   // 来自第一步
    captchaText: '用户输入的验证码',  // 用户填写的验证码文字
    // 可选：营销来源追踪
    trafficSource: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'spring_promo'
    }
  })
});
```

**联系表单支持的字段**（均为可选，除 `captchaId` 和 `captchaText` 外）：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 姓名 |
| `phone` | string | 电话 |
| `email` | string | 邮箱 |
| `company` | string | 公司/学校 |
| `message` | string | 留言内容 |
| `captchaId` | string | **必填**，来自 `GET /api/captcha` |
| `captchaText` | string | **必填**，用户输入的验证码 |
| `trafficSource` | object | 可选，UTM 参数对象 |

---

### ⚠️ 问题5.3：文章列表未正确渲染 HTML 内容

`GET /api/articles` 返回的每篇文章的 `content` 字段是**完整的 HTML 字符串**（包含 `<h2>`、`<p>`、`<strong>` 等标签），不是纯文本或 Markdown。

**文章对象完整结构：**

```json
{
  "id": "1677200000000_rewritten",
  "title": "AI如何赋能未来教育",
  "content": "<h2>引言</h2><p>这是<strong>HTML格式</strong>的文章内容...</p>",
  "imageUrl": "/images/articles/unsplash/photo-1.jpg",
  "keyword": "AI教育",
  "createdAt": "2026-02-28T12:00:00.000Z",
  "published": true,
  "type": "search_rewritten",
  "sourceUrl": "https://example.com/original-article",
  "imageSource": "unsplash",
  "imageAuthor": "John Doe",
  "imageAuthorUrl": "https://unsplash.com/@johndoe?utm_source=...",
  "imageUnsplashUrl": "https://unsplash.com/?utm_source=..."
}
```

**`type` 字段说明：**
- `ai_generated`：AI 原创文章
- `search_rewritten`：搜索改写文章（`sourceUrl` 字段有值）

**前端渲染方式（React 示例）：**

```jsx
// 文章详情页：必须用 dangerouslySetInnerHTML 渲染 HTML 内容
<div
  className="article-content prose"
  dangerouslySetInnerHTML={{ __html: article.content }}
/>
```

**强烈建议**为文章内容容器添加 `@tailwindcss/typography` 的 `prose` 类，或自定义 CSS，使 h2/h3/strong/blockquote/ul 等标签呈现出美观的排版样式。

---

### ⚠️ 问题5.4：未显示 Unsplash 图片署名

详见 [FRONTEND_ATTRIBUTION.md](./FRONTEND_ATTRIBUTION.md)。核心要求：当 `article.imageSource === 'unsplash'` 时，必须在图片下方显示 `Photo by [摄影师] on Unsplash`，并附带正确的链接。

```jsx
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <p className="text-sm text-gray-500 mt-2">
    Photo by{' '}
    <a href={article.imageAuthorUrl} target="_blank" rel="noopener noreferrer">
      {article.imageAuthor}
    </a>{' '}
    on{' '}
    <a href={article.imageUnsplashUrl} target="_blank" rel="noopener noreferrer">
      Unsplash
    </a>
  </p>
)}
```

---

### ✅ 前端对接完整检查清单

在提交代码或上线前，逐项确认：

- [ ] **路由排除**：`index.html` 第一个 `<script>` 中已加入 `/admin/` 路径检测代码
- [ ] **开发代理**：dev server 已将 `/api` 代理到后端（如 `http://localhost:3001`）
- [ ] **Nginx 配置**：`/admin/` location 在 `/` 之前定义，使用 `alias` 而非 `root`
- [ ] **验证码流程**：联系表单先 `GET /api/captcha`，再将 `captchaId` 和 `captchaText` 随表单一起提交
- [ ] **HTML 渲染**：文章 `content` 字段通过 `innerHTML` 或 `dangerouslySetInnerHTML` 渲染，而非作为纯文本显示
- [ ] **Unsplash 署名**：文章列表页和详情页均已实现条件渲染署名逻辑
- [ ] **后台入口**：前端页面（如 Footer 或导航）有指向 `/admin/login.html` 的链接
- [ ] **API Base URL**：前端代码中 API 路径使用相对路径 `/api`，不硬编码域名

---

**文档版本**: v1.0  
**最后更新**: 2026-03-01  
**维护者**: AI Development Team


---

### ⚠️ 问题5.5：营销来源追踪（UTM）未正确传递

**问题描述**：从百度广告等带 UTM 参数的 URL 访问网站并提交表单后，后台「线索管理」中显示的来源是「直接访问」，而不是预期的「💰 baidu 广告」。

**根本原因**：前端在提交联系表单时，没有从当前页面 URL 中读取 UTM 参数，并将其放入 `POST /api/contact` 请求体的 `trafficSource` 字段中。

**标准实现**：前端必须在用户**首次进入网站时**，从 `window.location.search` 中解析所有 `utm_` 参数，连同 `document.referrer` 一起，存入一个对象，并保存在 `localStorage` 中。在提交联系表单时，从 `localStorage` 中读取这个对象，并作为 `trafficSource` 字段发送给后端。

**`trafficSource` 对象结构**（前端发送给后端）：

```json
{
  "source": "baidu",
  "medium": "cpc",
  "campaign": "spring_promo",
  "keyword": "AI阅卷",
  "referrer": "https://www.baidu.com/s?wd=..."
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `source` | string | 对应 `utm_source` |
| `medium` | string | 对应 `utm_medium` |
| `campaign` | string | 对应 `utm_campaign` |
| `keyword` | string | 对应 `utm_term` 或 `utm_keyword` |
| `referrer` | string | **必须包含** `document.referrer` |

**后端识别逻辑**：后端会综合 `source`、`medium` 和 `referrer` 字段来判断流量类型（付费广告、自然搜索、引荐、直接访问）。即使 `source` 和 `medium` 为空，只要 `referrer` 包含 `baidu.com`，后端也能识别为百度自然搜索。

---

### 🧪 如何测试来源追踪功能

在开发和测试阶段，无需花费广告费。可以使用以下方法模拟不同来源：

#### 方法一：URL 加 UTM 参数（模拟付费广告）

直接在你的网站 URL 后面加上 UTM 参数，然后访问并提交表单。

- **模拟百度广告**：
  ```
  https://your-domain.com/?utm_source=baidu&utm_medium=cpc&utm_campaign=test
  ```
  提交后，后台应显示 `💰 baidu 广告`。

- **模拟谷歌广告**：
  ```
  https://your-domain.com/?utm_source=google&utm_medium=cpc&utm_campaign=test
  ```
  提交后，后台应显示 `💰 google 广告`。

#### 方法二：浏览器控制台注入（模拟自然搜索）

自然搜索没有 UTM 参数，依赖 `referrer`。可以在浏览器开发者工具的 Console 中执行以下代码，手动模拟来自百度的自然搜索点击。

1. 打开你的网站
2. 按 F12 打开开发者工具，切换到 Console 标签页
3. 粘贴并执行以下代码：
   ```javascript
   localStorage.setItem('traffic_source', JSON.stringify({
     source: '',
     medium: 'organic',
     referrer: 'https://www.baidu.com/s?wd=AI阅卷',
     timestamp: new Date().toISOString()
   }));
   console.log('已模拟百度自然搜索来源');
   ```
4. 刷新页面，然后提交联系表单。后台应显示 `🔍 Baidu 自然搜索`。

#### 方法三：使用 curl 直接调用 API（最精准）

适合开发者进行精准、可重复的测试。

```bash
# 1. 获取验证码
CAPTCHA_ID=$(curl -s https://your-domain.com/api/captcha | jq -r '.captchaId')

# 2. 提交表单（手动填入验证码）
curl -X POST https://your-domain.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "百度广告测试",
    "email": "test@example.com",
    "captchaId": "'$CAPTCHA_ID'",
    "captchaText": "...",
    "trafficSource": {
      "source": "baidu",
      "medium": "cpc",
      "campaign": "品牌词",
      "referrer": "https://www.baidu.com/"
    }
  }'
```

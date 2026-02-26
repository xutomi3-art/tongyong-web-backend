# 安全配置指南 (Security Guide)

本文档提供了通用Web后端的关键安全配置和最佳实践。

---

## 🚨 高优先级安全配置

### 1. JWT Secret

**风险**: 使用默认或弱密钥会导致Token被伪造，管理员账户被盗用。

**操作**: 必须在生产环境中设置一个强随机的 `JWT_SECRET` 环境变量。

**生成强密钥**: 
```bash
openssl rand -base64 32
```

**配置方式**:
```bash
# 在服务器的 .env 文件或启动脚本中设置
export JWT_SECRET="your-super-long-and-random-secret-key-here"
```

### 2. CORS (跨域资源共享)

**风险**: 默认配置 `app.use(cors())` 允许任何网站访问你的API，可能导致CSRF攻击和数据泄露。

**操作**: 配置严格的CORS白名单，只允许你的前端域名访问。

**推荐配置 (`index.js`)**:
```javascript
app.use(cors({
  origin: [
    // 生产环境域名
    'https://your-domain.com',
    'https://www.your-domain.com',
    
    // 开发环境 (可选)
    'http://localhost:3000',
    'http://localhost:5173' // Vite
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 3. 请求频率限制 (Rate Limiting)

**风险**: 缺少频率限制可能导致暴力破解、DDoS攻击和资源滥用。

**操作**: 对关键接口（特别是登录和验证码）添加频率限制。

**安装依赖**:
```bash
npm install express-rate-limit
```

**推荐配置 (`index.js`)**:
```javascript
const rateLimit = require('express-rate-limit');

// 登录接口限流 (15分钟内最多5次)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '登录尝试次数过多，请15分钟后再试'
});
app.post('/api/admin/login', loginLimiter, ...);

// 全局限流 (15分钟内最多100次)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

### 4. 安全HTTP头 (Helmet)

**风险**: 缺少安全HTTP头可能使你的应用受到XSS、点击劫持等攻击。

**操作**: 使用 `helmet` 中间件自动设置安全相关的HTTP头。

**安装依赖**:
```bash
npm install helmet
```

**推荐配置 (`index.js`)**:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 🔒 中优先级安全配置

### 1. 环境变量管理

**风险**: 在代码中硬编码敏感信息（如API密钥、数据库密码）会导致严重的安全问题。

**操作**: 
1. 使用 `.env` 文件管理所有环境变量。
2. 创建一个 `.env.example` 文件作为模板，并将其提交到Git仓库。
3. **绝对不要**将 `.env` 文件提交到Git仓库。

**.gitignore 配置**:
```
# .gitignore
.env
*.env.local
```

### 2. 密码存储

**风险**: 明文存储密码是极其危险的。

**操作**: 使用 `bcryptjs` 对密码进行哈希处理。

**当前实现 (正确)**:
```javascript
// 存储密码时
const hashedPassword = await bcrypt.hash(password, 10);

// 验证密码时
const isMatch = await bcrypt.compare(password, user.password);
```

### 3. 验证码存储

**风险**: 当前使用内存存储验证码，在多服务器部署和服务器重启时会失效。

**操作**: 推荐使用外部存储（如Redis）来存储验证码。

**Redis配置示例**:
```javascript
// 需要安装 ioredis
const Redis = require('ioredis');
const redis = new Redis();

// 存储验证码
await redis.set(`captcha:${id}`, text, 'EX', 300); // 5分钟过期

// 验证验证码
const storedText = await redis.get(`captcha:${id}`);
```

---

## 🛡️ 最佳实践

### 1. HTTPS

**必须**在生产环境中使用HTTPS，以加密客户端和服务器之间的所有通信。可以使用Nginx或Caddy作为反向代理来处理SSL证书。

### 2. 错误处理

在生产环境中，不要向客户端泄露详细的错误信息（如堆栈跟踪）。

**推荐配置 (`index.js`)**:
```javascript
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message
  });
});
```

### 3. 输入验证

对所有来自客户端的输入进行严格验证，防止SQL注入、XSS等攻击。

**推荐使用 `express-validator`**:
```bash
npm install express-validator
```

**示例 (`index.js`)**:
```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/contact',
  body('email').isEmail(),
  body('phone').isMobilePhone('zh-CN'),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ...
  }
);
```

### 4. 依赖安全

定期检查项目依赖是否存在已知的安全漏洞。

**使用 `npm audit`**:
```bash
npm audit

# 自动修复漏洞
npm audit fix
```

---

**文档版本**: 1.0.0  
**最后更新**: 2026-02-26

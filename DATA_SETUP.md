# 数据初始化指南

## 🎯 目标

本文档说明如何在首次部署后初始化系统数据和配置。

---

## 📋 初始化步骤

### 1. 创建配置文件

首次部署后，需要创建 `data/config.json` 配置文件：

```bash
# 创建data目录（如果不存在）
mkdir -p data

# 复制示例配置文件
cp data/config.example.json data/config.json
```

### 2. 修改配置文件

编辑 `data/config.json`，填入您的实际配置：

#### 品牌配置

```json
{
  "brandConfig": {
    "name": "您的品牌名称",
    "description": "您的产品描述",
    "adminTitle": "管理后台"
  }
}
```

#### 邮件配置

```json
{
  "emailConfig": {
    "service": "qq",
    "host": "smtp.qq.com",
    "port": 465,
    "secure": true,
    "user": "your-email@qq.com",
    "pass": "your-smtp-authorization-code",
    "from": "your-email@qq.com",
    "adminEmail": "admin@example.com"
  }
}
```

**获取SMTP授权码**：
- **QQ邮箱**：设置 → 账户 → POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务 → 生成授权码
- **163邮箱**：设置 → POP3/SMTP/IMAP → 开启服务 → 获取授权码
- **Gmail**：需要开启"允许不够安全的应用"或使用应用专用密码

#### 飞书配置（可选）

```json
{
  "feishuConfig": {
    "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-url",
    "appId": "your-app-id",
    "appSecret": "your-app-secret",
    "tableUrl": "your-feishu-table-url"
  }
}
```

#### LLM配置

```json
{
  "llmConfig": {
    "provider": "openai",
    "apiKey": "your-openai-api-key",
    "baseURL": "https://api.openai.com/v1",
    "model": "gpt-4"
  }
}
```

**支持的LLM提供商**：
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **豆包（ByteDance）**: doubao-seed-1-8-251228
- **其他兼容OpenAI API的服务**

#### 图片API配置

```json
{
  "imageConfig": {
    "unsplashApiKey": "your-unsplash-access-key",
    "useAI": false,
    "aiApiKey": "",
    "enableDeduplication": true,
    "deduplicationWindow": 5
  }
}
```

**获取Unsplash API Key**：
1. 访问 https://unsplash.com/developers
2. 注册开发者账号
3. 创建新应用
4. 获取Access Key

#### 管理员账号

```json
{
  "adminConfig": {
    "username": "admin",
    "password": "your-secure-password"
  }
}
```

**⚠️ 重要**：请立即修改默认密码为强密码！

### 3. 创建数据文件

系统需要以下数据文件，首次启动时会自动创建：

```bash
# 创建空的数据文件
echo "[]" > data/messages.json
echo "[]" > data/articles.json
```

### 4. 设置文件权限

确保配置文件的安全性：

```bash
# 设置配置文件为只读（仅所有者可读写）
chmod 600 data/config.json

# 设置数据文件权限
chmod 644 data/messages.json
chmod 644 data/articles.json
```

---

## 🔒 安全建议

### 1. 保护配置文件

- ✅ `data/config.json` 已被添加到 `.gitignore`
- ✅ 不要将配置文件提交到Git仓库
- ✅ 使用环境变量或密钥管理服务存储敏感信息

### 2. 修改默认密码

首次登录后，立即修改管理员密码：

1. 访问管理后台
2. 切换到"系统设置"Tab
3. 修改登录密码

### 3. 使用强密码

- 至少12位字符
- 包含大小写字母、数字和特殊字符
- 不使用常见密码或个人信息

---

## 🤖 AI操作指南

当AI帮助用户初始化系统时，应该：

1. **读取本文档**：了解初始化流程
2. **检查文件**：确认 `data/` 目录是否存在
3. **创建配置**：从 `config.example.json` 复制并修改
4. **询问用户**：获取必要的API密钥和配置信息
5. **验证配置**：检查配置格式是否正确
6. **设置权限**：确保文件权限安全
7. **启动服务**：指导用户启动服务并测试

---

## ✅ 初始化检查清单

- [ ] 已创建 `data/config.json`
- [ ] 已填写品牌配置
- [ ] 已填写邮件配置（SMTP授权码）
- [ ] 已填写LLM API密钥
- [ ] 已填写Unsplash API密钥
- [ ] 已修改管理员密码
- [ ] 已创建 `messages.json` 和 `articles.json`
- [ ] 已设置文件权限
- [ ] 已测试邮件发送功能
- [ ] 已测试文章生成功能

---

## 🚀 启动服务

配置完成后，启动服务：

```bash
# 开发环境
node index.js

# 生产环境（使用PM2）
pm2 start index.js --name "tongyong-web-backend"
```

访问管理后台：

```
http://localhost:3000/admin/login.html
```

---

## 🔧 故障排除

### 问题1：无法启动服务

**症状**：运行 `node index.js` 报错

**可能原因**：
- 缺少 `data/config.json` 文件
- 配置文件格式错误

**解决方法**：
```bash
# 检查配置文件是否存在
ls -la data/config.json

# 验证JSON格式
cat data/config.json | python3 -m json.tool
```

### 问题2：无法登录

**症状**：输入账号密码后提示错误

**可能原因**：
- 配置文件中没有 `adminConfig`
- 密码不正确

**解决方法**：
```bash
# 检查配置文件中的管理员配置
cat data/config.json | grep -A 3 "adminConfig"
```

### 问题3：邮件发送失败

**症状**：提交留言后没有收到邮件

**可能原因**：
- SMTP授权码不正确
- 邮箱服务商限制

**解决方法**：
1. 重新生成SMTP授权码
2. 检查邮箱服务是否开启SMTP
3. 查看服务日志：`pm2 logs tongyong-web-backend`

---

## 📚 相关文档

- [部署指南](./DEPLOYMENT.md) - 生产环境部署
- [品牌定制指南](./BRANDING.md) - 品牌信息定制
- [API文档](./API.md) - API接口说明
- [前端署名指南](./FRONTEND_ATTRIBUTION.md) - Unsplash署名

---

## 💡 总结

1. **创建配置文件**：从示例文件复制
2. **填写配置信息**：API密钥、邮箱、密码等
3. **创建数据文件**：空的JSON数组
4. **设置文件权限**：保护敏感信息
5. **启动服务**：测试功能

**配置完成后，您就可以开始使用通用Web后台管理系统了！** 🎉

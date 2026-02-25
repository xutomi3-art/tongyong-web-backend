# AI部署指南

本文档专门为AI助手编写，说明如何帮助用户部署和配置本系统。

---

## 🎯 AI的角色

当用户请求部署本系统时，AI应该：

1. **理解用户的品牌信息**
2. **自动修改配置文件**
3. **确保所有品牌相关的地方都已修改**
4. **提醒用户需要手动操作的部分**

---

## ⚠️ 关键提醒

### 1. 品牌定制是必须的

**默认配置中的占位符必须全部替换**：

- ❌ "您的品牌名称" → ✅ 用户的实际品牌名
- ❌ "您的产品描述" → ✅ 用户的实际产品描述
- ❌ "管理后台" → ✅ 用户品牌的管理后台标题

### 2. 邮件主题也需要品牌化

**配置项**: `brandConfig.emailSubjectPrefix`

**示例**:
- 用户品牌：JOTO AI
- 邮件主题前缀：`[JOTO AI] `
- 最终邮件主题：`[JOTO AI] 新留言通知`

**AI操作**：
```json
{
  "brandConfig": {
    "emailSubjectPrefix": "[用户品牌名] "
  }
}
```

### 3. Unsplash署名是强制性的

如果用户使用Unsplash图片API：

**后端**：
- ✅ 已自动添加署名信息到文章数据
- ✅ 管理后台会显示署名

**前端**：
- ⚠️ **用户的前端网站也必须显示署名**
- 📚 详见：[FRONTEND_ATTRIBUTION.md](./FRONTEND_ATTRIBUTION.md)

**AI必须提醒用户**：
```
⚠️ 重要提醒：您使用了Unsplash图片API，根据Unsplash的使用条款，
前端网站必须显示摄影师署名。请参考 FRONTEND_ATTRIBUTION.md 文档，
在前端网站的文章详情页添加署名代码。
```

---

## 📋 部署检查清单

### 第1步：克隆仓库

```bash
git clone https://github.com/xutomi3-art/tongyong-web-backend.git
cd tongyong-web-backend
npm install
```

### 第2步：创建配置文件

```bash
mkdir -p data
cp data/config.example.json data/config.json
echo "[]" > data/messages.json
echo "[]" > data/articles.json
```

### 第3步：修改品牌配置

**AI必须执行的操作**：

1. **询问用户品牌信息**：
   - 品牌名称
   - 产品描述
   - 管理后台标题（可选，默认为"{品牌名}管理后台"）

2. **修改配置文件**：
   ```json
   {
     "brandConfig": {
       "name": "用户提供的品牌名",
       "description": "用户提供的产品描述",
       "adminTitle": "用户品牌管理后台",
       "emailSubjectPrefix": "[用户品牌] ",
       "websiteUrl": "https://用户的域名.com"
     }
   }
   ```

3. **验证修改**：
   - 确保没有"您的品牌名称"等占位符
   - 确保emailSubjectPrefix包含品牌名
   - 确保websiteUrl是用户的实际域名

### 第4步：配置API密钥

**AI必须询问用户**：

1. **邮件配置**：
   - SMTP服务商（QQ、163、Gmail等）
   - 邮箱地址
   - SMTP授权码

2. **LLM API**（如果需要AI文章生成）：
   - 提供商（OpenAI、豆包等）
   - API Key
   - 模型名称

3. **Unsplash API**（如果需要图片）：
   - Access Key
   - ⚠️ **提醒用户前端也需要添加署名**

### 第5步：配置管理员账号

**默认账号**: test@abc.com / Test123

**AI必须提醒用户**：
```
⚠️ 安全提醒：系统默认管理员账号为 test@abc.com / Test123
首次登录后，系统会强制要求您修改密码。
建议修改为您自己的邮箱和强密码。
```

### 第6步：配置前端路由排除

**如果用户的前端项目使用了客户端路由，AI必须提醒用户修改前端代码。**

**AI必须执行的操作**：

1. **检查前端框架**：
   - 问用户：“您的前端项目使用什么框架？（React、Vue、Next.js等）”
   - 如果是SPA应用，几乎肯定使用了客户端路由

2. **提供解决方案**：
   ```
   ⚠️ 重要：您的前端项目使用了客户端路由，需要添加配置来排除 /admin/ 路径。
   
   否则前端路由会拦截后台管理系统的访问。
   
   请在您的前端项目的 index.html 中，在所有脚本加载之前添加：
   
   <script>
     if (window.location.pathname.startsWith('/admin/')) {
       window.__ADMIN_PATH__ = true;
       throw new Error('Admin path detected');
     }
   </script>
   
   📚 详细的各框架配置示例请参考：
   https://github.com/xutomi3-art/tongyong-web-backend/blob/main/DEPLOYMENT_ISSUES_FIXED.md
   ```

3. **验证配置**：
   - 提醒用户重新构建前端项目
   - 访问 `/admin/login.html` 应该显示后台登录页
   - 如果仍然显示前端页面，说明配置未生效

### 第7步：启动服务

```bash
# 开发环境
node index.js

# 生产环境
pm2 start index.js --name "用户品牌-backend"
```

### 第7步：验证部署

**AI应该帮助用户验证**：

1. **访问登录页面**：`http://域名/admin/login.html`
2. **检查页面标题**：是否显示用户的品牌名
3. **登录管理后台**：使用默认账号登录
4. **检查管理后台标题**：是否显示用户的品牌名和描述
5. **测试留言功能**：提交一条测试留言
6. **检查邮件通知**：邮件主题是否包含品牌名

---

## 🤖 AI操作示例

### 场景1：用户说"帮我部署这个后台"

**AI应该**：

1. **询问品牌信息**：
   ```
   好的！我来帮您部署。首先需要了解一些信息：
   
   1. 您的品牌名称是什么？
   2. 您的产品描述是什么？（一句话介绍您的产品）
   3. 您的网站域名是什么？
   ```

2. **克隆并初始化**：
   ```bash
   git clone https://github.com/xutomi3-art/tongyong-web-backend.git
   cd tongyong-web-backend
   npm install
   mkdir -p data
   cp data/config.example.json data/config.json
   ```

3. **修改品牌配置**：
   ```
   正在修改品牌配置...
   - 品牌名称：{用户提供的名称}
   - 产品描述：{用户提供的描述}
   - 邮件主题前缀：[{品牌名}] 
   ```

4. **询问API配置**：
   ```
   接下来需要配置一些API密钥：
   
   1. 邮件通知（必需）：
      - 您使用什么邮箱？（QQ、163、Gmail等）
      - 邮箱地址和SMTP授权码是什么？
   
   2. AI文章生成（可选）：
      - 是否需要AI文章生成功能？
      - 如果需要，请提供OpenAI或其他LLM的API Key
   
   3. 图片API（可选）：
      - 是否需要Unsplash图片？
      - 如果需要，请提供Unsplash Access Key
   ```

5. **检查前端路由**：
   ```
   请问您的前端项目使用什么框架？
   - React / Vue / Angular
   - Next.js / Nuxt.js
   - 其他
   ```

6. **配置前端路由排除**（如果是SPA应用）：
   ```
   ⚠️ 重要：您的前端项目使用了客户端路由，需要添加配置来排除 /admin/ 路径。
   
   请在您的前端项目的 index.html 中，在所有脚本之前添加：
   
   [... 代码示例 ...]
   
   详细说明请参考：DEPLOYMENT_ISSUES_FIXED.md
   ```

7. **提醒前端署名**（如果用户配置了Unsplash）：
   ```
   ⚠️ 重要提醒：
   
   您配置了Unsplash图片API。根据Unsplash的使用条款，
   前端网站必须显示摄影师署名。
   
   后端已经自动添加了署名信息，但您还需要在前端网站的
   文章详情页添加署名代码。
   
   详细指南请参考：FRONTEND_ATTRIBUTION.md
   ```

6. **启动服务**：
   ```bash
   pm2 start index.js --name "{品牌名}-backend"
   ```

7. **验证并交付**：
   ```
   ✅ 部署完成！
   
   访问地址：http://您的域名/admin/login.html
   默认账号：test@abc.com / Test123
   
   ⚠️ 首次登录后请立即修改密码！
   
   接下来您可以：
   1. 登录管理后台
   2. 在"留言配置"中完善邮件和飞书配置
   3. 在"文章管理"中配置LLM和Unsplash API
   4. 在"系统设置"中修改管理员密码
   ```

### 场景2：用户说"为什么显示'您的产品描述'？"

**AI应该**：

```
抱歉！我忘记修改品牌配置了。

这是因为配置文件中的品牌信息还是占位符。
让我立即帮您修改：

1. 您的品牌名称是什么？
2. 您的产品描述是什么？

修改后，刷新页面就能看到您的品牌信息了。
```

然后修改 `data/config.json` 中的 `brandConfig`。

### 场景3：用户说"我用了Unsplash，需要做什么？"

**AI应该**：

```
使用Unsplash图片需要做两件事：

1. ✅ 后端配置（已完成）：
   - 在 data/config.json 中填入Unsplash Access Key
   - 后端会自动添加摄影师署名信息

2. ⚠️ 前端配置（需要您操作）：
   - 在前端网站的文章详情页显示摄影师署名
   - 格式：Photo by [摄影师名] on Unsplash
   - 摄影师名和Unsplash都需要是可点击的链接
   - 链接必须包含UTM参数

详细的代码示例和说明请参考：FRONTEND_ATTRIBUTION.md

这是Unsplash的强制要求，否则可能违反使用条款。
```

---

## 📚 相关文档

- [BRANDING.md](./BRANDING.md) - 品牌定制详细指南
- [DATA_SETUP.md](./DATA_SETUP.md) - 数据初始化详细指南
- [FRONTEND_ATTRIBUTION.md](./FRONTEND_ATTRIBUTION.md) - 前端Unsplash署名指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 生产环境部署指南
- [BAIDU_ADS_UTM_GUIDE.md](./BAIDU_ADS_UTM_GUIDE.md) - 百度广告UTM配置指南

---

## ✅ 总结

**AI必须记住的4个关键点**：

1. **品牌配置是必须的**：
   - 不能留下“您的品牌名称”等占位符
   - 邮件主题前缀也要包含品牌名

2. **前端路由配置是必须的**：
   - 检查前端是否使用客户端路由
   - 提供具体的配置代码示例
   - 提醒用户重新构建前端项目
   - 验证 `/admin/login.html` 可以正常访问

3. **Unsplash署名是强制的**：
   - 后端自动添加署名信息
   - 前端网站也必须显示署名
   - 必须提醒用户阅读FRONTEND_ATTRIBUTION.md

4. **首次登录要修改密码**：
   - 默认账号：test@abc.com / Test123
   - 系统会强制要求修改密码
   - 提醒用户使用强密码

做到这四点，用户就能顺利部署并使用本系统了！🎉

# 品牌定制指南

本文档将指导您如何将通用Web后台管理系统定制为您自己的品牌，包括修改品牌名称、描述、Logo以及邮件模板等。

## 1. 核心品牌配置

所有核心品牌信息都集中在 `data/config.json` 文件中。您只需要修改 `brandConfig` 部分即可。

### 配置文件示例

```json
{
  "brandConfig": {
    "name": "您的品牌名称",
    "description": "您的产品描述",
    "adminTitle": "管理后台",
    "emailSubjectPrefix": "[您的品牌] "
  },
  // ... 其他配置
}
```

### 配置项说明

| 配置项 | 说明 | 示例 |
|---|---|---|
| `name` | 您的品牌名称，将显示在管理后台的副标题和邮件中 | `JOTO AI` |
| `description` | 您的产品描述，将显示在管理后台的副标题 | `AI全科阅卷系统` |
| `adminTitle` | 管理后台的标题，将显示在浏览器标签页和后台主标题 | `JOTO管理后台` |
| `emailSubjectPrefix` | 邮件主题前缀，用于区分系统邮件 | `[JOTO AI] ` |

### AI操作指南

当用户需要修改品牌信息时，AI应执行以下操作：

1. **读取配置文件**: `file(action="read", path="/home/ubuntu/tongyong-web-backend/data/config.json")`
2. **修改品牌信息**: 使用 `file(action="edit", ...)` 修改 `brandConfig` 部分
3. **重启服务**: `shell(action="exec", command="pm2 restart tongyong-web-backend")`

## 2. 邮件模板定制

邮件模板位于 `emails/` 目录下（如果存在）。您可以直接修改HTML文件来定制邮件的样式和内容。

### 动态变量

邮件模板中可以使用以下动态变量：

- `{{brandName}}`: 品牌名称
- `{{brandDescription}}`: 品牌描述
- `{{username}}`: 用户名
- `{{content}}`: 邮件正文

### 示例

```html
<p>您好，{{username}}！</p>

<p>感谢您使用 {{brandName}} - {{brandDescription}}。</p>

<p>{{content}}</p>
```

## 3. Logo和图标

管理后台的Logo和图标可以直接替换 `frontend/` 目录下的相关文件：

- `frontend/logo.svg`: 主Logo
- `frontend/favicon.ico`: 浏览器标签页图标

### AI操作指南

当用户需要替换Logo时，AI应：

1. **接收用户上传的Logo文件**
2. **替换文件**: `shell(action="exec", command="mv /path/to/new/logo.svg /home/ubuntu/tongyong-web-backend/frontend/logo.svg")`
3. **无需重启服务**，浏览器刷新即可看到效果

## 4. 路径统一为 /admin

我们已经修复了路径问题，确保所有部署都统一使用 `/admin` 路径访问管理后台。

### Nginx配置示例

```nginx
location /admin/ {
    proxy_pass http://localhost:3001/admin/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 关键配置

- **Node.js**: `app.use('/admin', express.static(path.join(__dirname, 'frontend')));`
- **Nginx**: `location /admin/`

确保Node.js和Nginx的路径配置一致，即可实现统一访问。

## 5. 品牌化检查清单

为了确保您的后台完全品牌化，请检查以下项目：

- [ ] **`data/config.json`**
  - [ ] `brandConfig.name`
  - [ ] `brandConfig.description`
  - [ ] `brandConfig.adminTitle`
  - [ ] `brandConfig.emailSubjectPrefix`
- [ ] **`frontend/logo.svg`** (替换为您的Logo)
- [ ] **`frontend/favicon.ico`** (替换为您的图标)
- [ ] **`emails/`** (如果存在，检查邮件模板)

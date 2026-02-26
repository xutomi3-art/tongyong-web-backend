# 通用Web后台管理系统 (tongyong-web-backend)

这是一个功能强大、高度可复用的通用Web后台管理系统，基于Node.js和Express构建。它提供了一系列开箱即用的功能，包括用户认证、数据管理、API服务、内容生成、外部服务集成等，旨在帮助开发者快速搭建Web应用或为现有前端项目提供强大的后端支持。

---

## 🤖 致AI助手 / For AI Assistants

为了帮助您更轻松地部署和配置此系统，我们编写了专属的AI部署指南。在开始之前，请务必阅读：

- 🚀 **[AI部署指南 (AI_DEPLOYMENT_GUIDE.md)](./AI_DEPLOYMENT_GUIDE.md)**
- 🔧 **[部署故障排除 (DEPLOYMENT_TROUBLESHOOTING.md)](./DEPLOYMENT_TROUBLESHOOTING.md)** - 常见问题及解决方案

---

## 品牌定制

本系统支持完整的品牌定制，包括修改品牌名称、描述、Logo以及邮件模板等。详细指南请参考：

- **[品牌定制指南 (BRANDING.md)](BRANDING.md)**

---

## 核心功能

**本系统包含完整的前端管理界面和后端API服务**，开箱即用。

- **留言与联系表单管理**: 接收、存储和管理用户通过网站表单提交的留言或联系信息。
- **邮件通知系统**: 在收到新留言或触发特定事件时，自动发送邮件通知管理员。
- **飞书(Feishu)集成**: 支持将新留言实时推送到指定的飞书群组，方便团队协作。
- **AI驱动的内容生成**: 集成大型语言模型（LLM，如GPT系列），可用于自动生成文章、报告或其他文本内容。
- **多源图片API集成**: 无缝集成Unsplash、Pexels、Pixabay等多个免费图库API，为生成的内容自动配图。⚠️ **重要**：使用Unsplash图片时，后端自动添加摄影师署名信息，**前端网站也必须显示署名**，详见[FRONTEND_ATTRIBUTION.md](./FRONTEND_ATTRIBUTION.md)。
- **RESTful API**: 提供一套设计良好、易于理解的RESTful API，方便前端应用（如React, Vue, Angular或移动App）进行数据交互。
- **灵活的配置管理**: 所有敏感信息和环境配置（如API密钥、数据库连接）都通过外部JSON文件管理，安全且易于维护。
- **可扩展的图片源架构**: 设计了统一的图片源接口，可以轻松添加新的图片API服务商。
- **多管理员支持与邀请系统**: 支持多个管理员共同管理后台，并可通过邮件邀请新成员。
- **UTM链接生成器**: 内置UTM链接生成工具，方便市场营销人员创建带追踪参数的推广链接。

## 技术架构

### 后端技术栈

| 技术          | 用途说明                                     |
|---------------|----------------------------------------------|
| **Node.js**   | JavaScript运行时环境，提供高效的I/O处理能力。  |
| **Express.js**| 轻量、灵活的Web应用框架，用于构建API和路由。   |
| **Axios**     | 基于Promise的HTTP客户端，用于请求外部API。     |
| **Nodemailer**| 发送电子邮件的模块。                         |
| **node-cron** | 定时任务库，用于执行计划性任务（如自动发布）。 |

### 项目结构

```
/tongyong-web-backend
├── frontend/                 # 前端管理界面（HTML/CSS/JavaScript）
│   ├── admin.html            # 主管理后台（4个Tab：留言配置、留言管理、文章管理、系统设置）
│   ├── admin-email.html      # 邮件管理页面
│   ├── admin-feishu.html     # 飞书集成页面
│   ├── admin-auto-post.html  # 自动发布页面
│   └── README.md             # 前端使用说明
├── data/                     # 数据和配置目录（需手动创建）
│   ├── config.json           # 生产环境配置文件（包含敏感信息，被.gitignore忽略）
│   ├── articles.json         # 存储文章数据
│   └── messages.json         # 存储留言数据
├── image-sources/            # 图片API服务商集成模块
│   ├── base-source.js        # 图片源基类
│   ├── unsplash-source.js    # Unsplash API实现
│   ├── pexels-source.js      # Pexels API实现
│   └── ...                   # 其他图片源
├── .gitignore                # Git忽略规则，保护敏感文件
├── README.md                 # 项目说明文档
├── DEPLOYMENT.md             # 详细部署指南
├── API.md                    # API接口文档
├── index.js                  # Express服务主入口文件
├── article-generator.js      # AI文章生成模块
├── unsplash-fetcher-simple.js # Unsplash图片获取逻辑
├── package.json              # 项目依赖和脚本配置
└── ...                       # 其他辅助模块
```

---

## 📚 文档

**核心必读**

- 🚀 **[AI部署指南](./AI_DEPLOYMENT_GUIDE.md)** - **（AI助手必读）** 部署、配置和品牌化的详细步骤。
- 📖 **[数据初始化指南](./DATA_SETUP.md)** - 首次部署后如何初始化配置和数据。
- 🎨 **[品牌定制指南](./BRANDING.md)** - 如何定制品牌信息、Logo和邮件模板。
- 📝 **[API文档](./docs/API.md)** - 完整的API接口说明和TypeScript类型定义。
- 🛠️ **[客户端SDK](./docs/client-sdk.ts)** - 类型安全的API调用封装。

**功能与部署**
- ⬆️ **[部署指南](./DEPLOYMENT.md)** - 详细的生产环境部署步骤。
- 🐛 **[部署问题修复记录](./DEPLOYMENT_ISSUES_FIXED.md)** - **（重要）** 实际部署中发现并修复的问题。
- 🖼️ **[前端署名指南](./FRONTEND_ATTRIBUTION.md)** - **（重要）** 前端网站如何显示Unsplash署名。
- 🔗 **[百度广告UTM配置指南](./BAIDU_ADS_UTM_GUIDE.md)** - 如何为百度广告系列配置UTM参数。

---

## 快速开始

### 1. 环境要求

- Node.js (>= 16.x)
- npm 或 yarn

### 2. 克隆仓库

```bash
git clone https://github.com/xutomi3-art/tongyong-web-backend.git
cd tongyong-web-backend
```

### 3. 安装依赖

```bash
npm install
```

### 4. 初始化配置和数据

⚠️ **重要**：首次部署后，必须初始化配置文件和数据文件。

```bash
# 创建数据目录
mkdir data

# 复制配置示例文件
cp data/config.example.json data/config.json

# 创建空的数据文件
echo "[]" > data/messages.json
echo "[]" > data/articles.json
```

然后编辑 `data/config.json`，填入您的实际配置：

- **品牌信息**：修改 `brandConfig`
- **邮件配置**：填入SMTP服务器和授权码
- **LLM API**：填入OpenAI或其他LLM的API密钥
- **Unsplash API**：填入Unsplash Access Key
- **管理员密码**：修改默认密码

📚 **详细步骤请参考**：[DATA_SETUP.md](./DATA_SETUP.md)

> **安全提示**: `data/config.json` 包含敏感信息，已被 `.gitignore` 忽略，不会提交到Git仓库。

### 5. 启动服务

```bash
node index.js
```

服务默认在 `3000` 端口启动。您可以通过环境变量 `PORT` 修改端口：

```bash
PORT=8080 node index.js
```

### 6. 访问管理后台

启动服务后，在浏览器中访问登录页面：

```
http://localhost:3000/admin/login.html
```

使用您在 `data/config.json` 中设置的管理员账号登录（默认用户名：`admin`）。

**管理后台功能**：
- **留言配置**: 配置邮件通知、SMTP服务器、飞书集成
- **留言管理**: 查看和管理用户提交的留言
- **文章管理**: 配置LLM、Unsplash API，管理生成的文章
- **系统设置**: 修改登录密码、系统参数

详细的前端使用说明请参考 `frontend/README.md`。

### 7. 生产环境部署

为了保证服务的稳定性和持续运行，推荐使用进程管理工具（如PM2）进行部署。

```bash
# 全局安装 PM2
npm install pm2 -g

# 启动应用
pm2 start index.js --name "tongyong-web-backend"

# 查看应用状态
pm2 list

# 监控日志
pm2 logs tongyong-web-backend
```

更详细的部署方法（包括Nginx反向代理、SSL配置等），请参考 `DEPLOYMENT.md`。

---

## API接口文档

本后台提供了一系列RESTful API，方便前端调用。详细的接口列表、请求参数和返回格式，请参考 `API.md` 文件。

### 主要接口概览

- `POST /api/messages` - 提交新的留言
- `GET /api/messages` - 获取所有留言（需要认证）
- `GET /api/articles` - 获取已发布的文章列表
- `POST /api/articles/generate` - 生成新的AI文章（需要认证）

## 贡献指南

我们欢迎任何形式的贡献！如果你发现了Bug或有任何功能建议，请随时提交Issues或Pull Requests。

1. Fork本仓库
2. 创建你的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的代码 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个Pull Request

## License

本项目采用 [MIT](LICENSE) 开源协议。

# 通用Web后台管理系统 (tongyong-web-backend)

这是一个功能强大、高度可复用的通用Web后台管理系统，基于Node.js和Express构建。它提供了一系列开箱即用的功能，包括用户认证、数据管理、API服务、内容生成、外部服务集成等，旨在帮助开发者快速搭建Web应用或为现有前端项目提供强大的后端支持。

---

## 核心功能

- **留言与联系表单管理**: 接收、存储和管理用户通过网站表单提交的留言或联系信息。
- **邮件通知系统**: 在收到新留言或触发特定事件时，自动发送邮件通知管理员。
- **飞书(Feishu)集成**: 支持将新留言实时推送到指定的飞书群组，方便团队协作。
- **AI驱动的内容生成**: 集成大型语言模型（LLM，如GPT系列），可用于自动生成文章、报告或其他文本内容。
- **多源图片API集成**: 无缝集成Unsplash、Pexels、Pixabay等多个免费图库API，为生成的内容自动配图。
- **RESTful API**: 提供一套设计良好、易于理解的RESTful API，方便前端应用（如React, Vue, Angular或移动App）进行数据交互。
- **灵活的配置管理**: 所有敏感信息和环境配置（如API密钥、数据库连接）都通过外部JSON文件管理，安全且易于维护。
- **可扩展的图片源架构**: 设计了统一的图片源接口，可以轻松添加新的图片API服务商。

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

### 4. 创建配置文件

首先，创建`data`目录，然后将`data/config.example.json`复制一份并重命名为`data/config.json`。

```bash
mkdir data
cp data/config.example.json data/config.json
```

接着，根据你的实际情况修改`data/config.json`文件，填入正确的API密钥和服务地址。

```json
{
  "emailConfig": {
    "service": "qq",
    "user": "your-email@qq.com",
    "pass": "your-smtp-authorization-code",
    "adminEmail": "admin@example.com"
  },
  "feishuConfig": {
    "webhookUrl": "your-feishu-webhook-url"
  },
  "llmConfig": {
    "apiKey": "your-openai-api-key"
  },
  "unsplashApiKey": "your-unsplash-access-key",
  // ... 其他配置
}
```

> **重要提示**: `data/config.json`文件包含敏感信息，已被添加到`.gitignore`中，不会被提交到版本库。

### 5. 启动服务

```bash
node index.js
```

服务默认在`3000`端口启动。你可以在`index.js`中修改端口号。

### 6. 生产环境部署

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

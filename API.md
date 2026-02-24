# API接口文档 (API Reference)

本系统提供了一套标准的RESTful API，所有接口的根路径为 `/api`。返回数据格式均为JSON。

---

## 认证

部分接口（如管理类接口）需要认证才能访问。认证通过在请求头中包含一个有效的`Authorization`字段实现，具体认证方式（如Bearer Token, API Key）可在`index.js`中配置。

---

## 留言管理 (Messages)

### 1. 提交新留言

- **Endpoint**: `POST /api/messages`
- **描述**: 接收并保存用户从前端表单提交的留言。
- **请求体 (Body)**: `application/json`

```json
{
  "name": "王五",
  "phone": "13900139000",
  "school": "未来实验小学",
  "message": "我想咨询一下关于AI阅卷系统的详细定价。"
}
```

- **成功响应 (201) - Created**:

```json
{
  "success": true,
  "message": "留言已成功提交！",
  "id": "msg-1677200000000-randomstring"
}
```

- **失败响应 (400) - Bad Request**:

```json
{
  "success": false,
  "error": "姓名和电话是必填项。"
}
```

### 2. 获取所有留言

- **Endpoint**: `GET /api/messages`
- **描述**: 获取所有已保存的留言列表。**需要认证**。
- **成功响应 (200) - OK**:

```json
[
  {
    "id": "msg-1677200000000-randomstring",
    "name": "王五",
    "phone": "13900139000",
    "school": "未来实验小学",
    "message": "我想咨询一下关于AI阅卷系统的详细定价。",
    "timestamp": "2026-02-24T09:00:00.000Z",
    "read": false
  },
  {
    "id": "msg-1677100000000-randomstring",
    "name": "李四",
    "phone": "13800138000",
    "school": "希望中学",
    "message": "系统是否支持英语作文的批改？",
    "timestamp": "2026-02-23T18:30:00.000Z",
    "read": true
  }
]
```

### 3. 将留言标记为已读

- **Endpoint**: `PUT /api/messages/:id/read`
- **描述**: 将指定ID的留言标记为已读。**需要认证**。
- **成功响应 (200) - OK**:

```json
{
  "success": true,
  "message": "留言已标记为已读。"
}
```

---

## 文章管理 (Articles)

### 1. 获取文章列表

- **Endpoint**: `GET /api/articles`
- **描述**: 获取所有已发布的文章，用于前端展示。
- **成功响应 (200) - OK**:

```json
[
  {
    "id": "article-001",
    "title": "AI如何变革教育评价体系",
    "content": "文章内容预览...",
    "imageUrl": "/images/articles/unsplash/photo-1.jpg",
    "publishedAt": "2026-02-24T10:00:00.000Z"
  }
]
```

### 2. 获取单篇文章详情

- **Endpoint**: `GET /api/articles/:id`
- **描述**: 根据ID获取单篇文章的完整内容。
- **成功响应 (200) - OK**:

```json
{
  "id": "article-001",
  "title": "AI如何变革教育评价体系",
  "content": "完整的HTML格式的文章内容...",
  "keywords": "AI,教育,评价",
  "imageUrl": "/images/articles/unsplash/photo-1.jpg",
  "publishedAt": "2026-02-24T10:00:00.000Z"
}
```

### 3. 生成新文章

- **Endpoint**: `POST /api/articles/generate`
- **描述**: 触发一次AI文章生成任务。**需要认证**。
- **请求体 (Body)**: `application/json`

```json
{
  "topic": "关于在线教育的未来发展趋势",
  "keywords": "在线教育, AI, 未来趋势"
}
```

- **成功响应 (200) - OK**:

```json
{
  "success": true,
  "message": "文章生成任务已启动，请稍后在管理后台查看。",
  "articleId": "article-new-1677201000000"
}
```

---

## 系统配置管理 (Admin)

### 1. 获取系统配置

- **Endpoint**: `GET /api/admin/config`
- **描述**: 获取当前的系统配置信息（部分敏感信息会隐去）。**需要认证**。
- **成功响应 (200) - OK**:

```json
{
  "emailConfig": {
    "service": "qq",
    "user": "your-email@qq.com",
    "adminEmail": "admin@example.com"
  },
  "feishuConfig": {
    "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-url"
  },
  "llmConfig": {
    "provider": "openai",
    "model": "gpt-4"
  },
  "unsplashApiKey": "****-****-your-unsplash-access-key-suffix",
  "seoConfig": {
    "autoPublish": false,
    "publishInterval": 24
  }
}
```

### 2. 更新系统配置

- **Endpoint**: `POST /api/admin/config`
- **描述**: 更新系统配置。**需要认证**。
- **请求体 (Body)**: `application/json` (只需提供需要修改的字段)

```json
{
  "llmConfig": {
    "model": "gpt-4-turbo"
  },
  "unsplashApiKey": "new-unsplash-access-key"
}
```

- **成功响应 (200) - OK**:

```json
{
  "success": true,
  "message": "系统配置已成功更新。"
}
```

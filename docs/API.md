# 通用Web后端 API文档

本文档详细说明了通用Web后端提供的API接口，旨在帮助前端开发者快速集成。

## 核心概念

- **API基地址**: 所有API的基地址都是网站的根目录，例如 `https://your-domain.com/api/`
- **认证**: 管理后台接口需要通过 `Authorization: Bearer <token>` 头信息进行认证。
- **错误处理**: 所有API在失败时都会返回 `{ success: false, error: "错误信息" }` 格式的JSON。

---

## 公共接口

### 1. 获取验证码

获取用于联系表单或登录的图形验证码。

- **Endpoint**: `GET /api/captcha`
- **方法**: `GET`
- **响应**: `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "...", // 验证码ID
    "svg": "<svg>..." // Base64编码的SVG图像
  }
}
```

### 2. 提交联系表单

提交用户的联系信息。邮件和飞书通知将根据后端配置发送。

- **Endpoint**: `POST /api/contact`
- **方法**: `POST`
- **请求体** (`application/json`):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | `string` | 是 | 姓名 |
| `company` | `string` | 否 | 公司/学校 |
| `phone` | `string` | 是 | 电话 |
| `email` | `string` | 是 | 邮箱 |
| `message` | `string` | 否 | 留言内容 |
| `captchaId` | `string` | 是 | 验证码ID（从 `GET /api/captcha` 获取） |
| `captchaText` | `string` | 是 | 用户输入的验证码文本（**推荐**） |
| `captcha` | `string` | 是 | 兼容旧版，功能同 `captchaText` |
| `trafficSource` | `object` | 否 | UTM来源跟踪参数（可选） |

**注意**: 后端会自动检测客户端类型（手机/平板/电脑）并保存到留言记录中。

- **响应**: `200 OK`

```json
{
  "success": true
}
```

---

## 管理后台接口

### 1. 管理员登录

- **Endpoint**: `POST /api/admin/login`
- **方法**: `POST`
- **请求体** (`application/json`):

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | `string` | 是 | 用户名/邮箱 |
| `password` | `string` | 是 | 密码 |

- **响应**: `200 OK`

```json
{
  "success": true,
  "token": "..." // JWT Token
}
```

### 2. 获取后台配置

获取网站的各项配置信息。

- **Endpoint**: `GET /api/admin/config`
- **方法**: `GET`
- **认证**: `Bearer Token`
- **响应**: `200 OK` (返回配置对象)

### 3. 更新后台配置

- **Endpoint**: `POST /api/admin/config`
- **方法**: `POST`
- **认证**: `Bearer Token`
- **请求体**: 配置对象
- **响应**: `200 OK` `{ success: true }`

### 4. 修改密码

- **Endpoint**: `POST /api/admin/change-password`
- **方法**: `POST`
- **认证**: `Bearer Token`
- **请求体**:

```json
{
  "currentPassword": "...",
  "newPassword": "..."
}
```

- **响应**: `200 OK` `{ success: true }`

---

*本文档由Manus AI自动生成和维护。*

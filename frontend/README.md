# 管理后台前端界面

这个目录包含了完整的管理后台前端界面，是一个纯HTML+JavaScript的单页应用（SPA），无需构建工具，可以直接在浏览器中打开使用。

## 文件说明

| 文件 | 说明 | 功能 |
|------|------|------|
| `admin.html` | **主管理后台** | 包含4个Tab：留言配置、留言管理、文章管理、系统设置 |
| `admin-email.html` | 邮件管理页面 | 独立的邮件配置和测试页面 |
| `admin-feishu.html` | 飞书集成页面 | 独立的飞书Webhook和多维表格配置页面 |
| `admin-auto-post.html` | 自动发布页面 | SEO文章自动生成和发布配置页面 |

## 主管理后台功能 (admin.html)

### 1. 留言配置 Tab

**接收邮箱配置**:
- 设置接收留言通知的邮箱地址

**SMTP服务器配置**:
- SMTP服务器地址（如：smtp.163.com）
- 端口号（如：465）
- 用户名和密码/授权码
- 发件人地址

**飞书集成**:
- 飞书机器人Webhook URL
- 飞书多维表格同步（App ID、App Secret、表格URL）

**操作按钮**:
- 测试飞书Webhook
- 测试飞书表格
- 保存配置

### 2. 留言管理 Tab

显示所有用户提交的留言，包括：
- 提交时间
- 姓名
- 公司/学校
- 邮箱
- 留言内容

### 3. 文章管理 Tab

**LLM模型配置**:
- API Key（支持OpenAI、豆包等）
- API Endpoint
- 模型名称
- 测试连接功能

**Unsplash图片配置**:
- Unsplash Access Key
- 图片去重设置

**文章列表**:
- 显示已生成的文章
- 标题和发布时间

### 4. 系统设置 Tab

**修改登录密码**:
- 当前密码
- 新密码
- 确认新密码

**其他系统配置**:
- 管理员账号设置
- 系统参数配置

## 技术栈

- **HTML5** - 页面结构
- **TailwindCSS** - UI样式框架（通过CDN引入）
- **原生JavaScript** - 交互逻辑和API调用
- **Fetch API** - 与后端API通信

## 部署方式

### 方式1: 与后端一起部署（推荐）

将这些HTML文件放在后端服务的静态文件目录中，通过后端服务器访问。

**示例（Express.js）**:

```javascript
// 在 index.js 中添加静态文件服务
app.use('/admin', express.static('frontend'));

// 访问地址：http://your-domain.com/admin/admin.html
```

### 方式2: 独立部署

使用Nginx或其他Web服务器单独托管这些HTML文件。

**Nginx配置示例**:

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    
    root /path/to/frontend;
    index admin.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 代理API请求到后端
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 方式3: 本地开发

直接在浏览器中打开HTML文件进行开发和测试。

**注意**: 需要确保后端API服务已启动，并且CORS已正确配置。

## API对接

管理后台通过Fetch API与后端通信，主要API端点包括：

| API端点 | 方法 | 说明 |
|---------|------|------|
| `/api/config` | GET | 获取系统配置 |
| `/api/config` | POST | 保存系统配置 |
| `/api/messages` | GET | 获取留言列表 |
| `/api/articles` | GET | 获取文章列表 |
| `/api/test-llm` | POST | 测试LLM连接 |
| `/api/test-feishu-webhook` | POST | 测试飞书Webhook |
| `/api/test-feishu-table` | POST | 测试飞书表格 |

详细的API文档请参考根目录的 `API.md` 文件。

## 自定义和扩展

### 修改样式

管理后台使用TailwindCSS，可以直接修改HTML中的class来调整样式。

### 添加新功能

1. 在HTML中添加新的Tab或表单
2. 编写JavaScript函数处理交互逻辑
3. 调用后端API保存或获取数据

### 修改品牌信息

在HTML文件中搜索并替换：
- "闪阅" → 您的品牌名称
- "AI 全科阅卷系统" → 您的产品描述
- 修改顶部导航栏的渐变色（`from-purple-600 to-blue-600`）

## 安全注意事项

1. **登录认证**: 管理后台应该有登录认证机制，防止未授权访问
2. **HTTPS**: 生产环境必须使用HTTPS，保护敏感信息传输
3. **密码存储**: API Key和密码在前端显示时应该脱敏（显示为`••••••`）
4. **CORS配置**: 后端API应该正确配置CORS，只允许信任的域名访问

## 浏览器兼容性

- Chrome/Edge (推荐)
- Firefox
- Safari
- 不支持IE11及以下版本

## 常见问题

### 1. 页面打开后无法加载数据

**原因**: 后端API未启动或CORS配置错误

**解决**:
- 确保后端服务已启动（`node index.js` 或 `pm2 list`）
- 检查浏览器控制台的错误信息
- 确认后端已配置CORS中间件

### 2. 保存配置后没有反应

**原因**: API请求失败或后端未正确处理

**解决**:
- 打开浏览器开发者工具（F12）查看Network标签
- 检查API请求的响应状态和内容
- 查看后端日志（`pm2 logs`）

### 3. 样式显示不正常

**原因**: TailwindCSS CDN加载失败

**解决**:
- 检查网络连接
- 确认CDN地址可访问：`https://cdn.tailwindcss.com`
- 可以下载TailwindCSS到本地并修改引用路径

## 开发建议

1. **使用浏览器开发者工具**: 实时调试JavaScript和查看API请求
2. **模块化代码**: 将重复的功能提取为独立函数
3. **添加加载状态**: 在API请求时显示加载动画，提升用户体验
4. **错误处理**: 为所有API请求添加try-catch和错误提示
5. **响应式设计**: 确保在移动设备上也能正常使用（已使用TailwindCSS的响应式类）

## 未来改进方向

- [ ] 使用Vue.js或React重构，提升可维护性
- [ ] 添加数据可视化图表（如Chart.js）
- [ ] 实现实时通知功能（WebSocket）
- [ ] 添加文件上传功能
- [ ] 支持批量操作（批量删除留言、批量发布文章）
- [ ] 添加权限管理（多用户、角色权限）

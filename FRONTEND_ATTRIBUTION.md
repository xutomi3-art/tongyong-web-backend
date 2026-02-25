# 前端网站Unsplash署名指南

## 🎯 目标

为了符合Unsplash API使用条款，**前端网站（用户可见的博客/资讯页面）也必须显示Unsplash署名**。

本文档旨在指导AI和开发者如何在前端网站中正确添加Unsplash署名。

---

## 📝 署名要求

### 1. 署名格式

```
Photo by [摄影师名] on Unsplash
```

### 2. 链接要求

- **摄影师名**：必须链接到摄影师的Unsplash个人页面
- **Unsplash**：必须链接到Unsplash首页
- **UTM参数**：所有链接都必须包含UTM参数

### 3. 显示位置

- 文章详情页：图片下方
- 文章列表页：图片下方或旁边

---

## ⚙️ 如何实现

### 1. 数据来源

后端API返回的文章对象现在包含以下字段：

```javascript
{
  "imageUrl": "/images/articles/unsplash/abc123.jpg",
  "imageSource": "unsplash",
  "imageAuthor": "John Doe",
  "imageAuthorUrl": "https://unsplash.com/@johndoe?utm_source=shanyue_ai&utm_medium=referral",
  "imageUnsplashUrl": "https://unsplash.com/?utm_source=shanyue_ai&utm_medium=referral"
}
```

**关键字段**：
- `imageSource`：图片来源（`unsplash` | `ai` | `local`）
- `imageAuthor`：摄影师名字
- `imageAuthorUrl`：摄影师Unsplash页面链接（含UTM）
- `imageUnsplashUrl`：Unsplash首页链接（含UTM）

### 2. 前端代码示例

#### React / Vue / Svelte

```jsx
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <p className="text-sm text-gray-500 mt-2">
    Photo by{' '}
    <a 
      href={article.imageAuthorUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:underline"
    >
      {article.imageAuthor}
    </a>{' '}
    on{' '}
    <a 
      href={article.imageUnsplashUrl} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-blue-600 hover:underline"
    >
      Unsplash
    </a>
  </p>
)}
```

#### 原生JavaScript / EJS / Handlebars

```html
<% if (article.imageSource === 'unsplash' && article.imageAuthor) { %>
  <p class="text-sm text-gray-500 mt-2">
    Photo by 
    <a 
      href="<%= article.imageAuthorUrl %>" 
      target="_blank" 
      rel="noopener noreferrer" 
      class="text-blue-600 hover:underline"
    >
      <%= article.imageAuthor %>
    </a> 
    on 
    <a 
      href="<%= article.imageUnsplashUrl %>" 
      target="_blank" 
      rel="noopener noreferrer" 
      class="text-blue-600 hover:underline"
    >
      Unsplash
    </a>
  </p>
<% } %>
```

### 3. CSS样式

如果您的前端项目不使用TailwindCSS，可以使用以下CSS：

```css
.unsplash-attribution {
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
}

.unsplash-attribution a {
  color: #2563eb;
  text-decoration: none;
}

.unsplash-attribution a:hover {
  text-decoration: underline;
}
```

---

## 🤖 AI操作指南

当用户要求更新前端网站以显示Unsplash署名时，AI应该：

1. **读取本文档**：了解署名要求和实现方法
2. **定位前端代码**：找到文章详情页和文章列表页的模板文件
3. **添加署名代码**：将上面的代码示例添加到图片下方
4. **验证数据**：确保前端可以访问`article.imageSource`等字段
5. **测试显示**：确保只有Unsplash图片才显示署名
6. **提交代码**：将修改后的前端代码提交到对应的Git仓库

---

## ✅ 检查清单

- [ ] **文章详情页**：已添加Unsplash署名
- [ ] **文章列表页**：已添加Unsplash署名
- [ ] **链接正确**：包含UTM参数，新窗口打开
- [ ] **样式美观**：不影响主要内容
- [ ] **条件渲染**：只有Unsplash图片才显示署名

---

## 💡 示例

### 博客文章详情页

```
┌──────────────────────────────────────────────────┐
│  # AI阅卷：重塑教育评价效率                      │
│                                                  │
│  📅 2026-02-24  👤 作者：AI                      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │                                            │  │
│  │                  [图片]                    │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│  Photo by John Doe on Unsplash                   │
│                                                  │
│  对于一线教育工作者来说，每次考试后的试卷分析... │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 博客文章列表页

```
┌──────────────────────────────────────────────────┐
│  [图片]  AI阅卷：重塑教育评价效率                │
│          Photo by John Doe on Unsplash           │
│                                                  │
│  [图片]  个性化教学落地实践                      │
│          Photo by Sarah Johnson on Unsplash      │
│                                                  │
└──────────────────────────────────────────────────┘
```

---

## 🚀 总结

1. **为什么**：符合Unsplash API使用条款
2. **做什么**：在前端网站显示Unsplash署名
3. **怎么做**：使用后端返回的`imageSource`等字段，添加条件渲染
4. **谁来做**：AI或开发者

**请务必更新前端网站，否则您的Unsplash API可能会被禁用！**

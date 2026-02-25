# Unsplash 图片署名要求

## 📋 重要提示

**Unsplash API 使用条款要求在前端显示图片署名信息！**

根据 [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)，所有使用 Unsplash 图片的应用必须：

1. ✅ 提及 "Unsplash"
2. ✅ 显示摄影师的名字
3. ✅ 提供链接到摄影师的 Unsplash 个人资料

**⚠️ 如果不遵守这些要求，Unsplash 可能会拒绝将您的应用升级到生产环境！**

---

## 🔧 后端实现

### 1. 文章数据结构

后端在生成文章时，已经包含了 Unsplash 署名信息：

```javascript
{
  "title": "文章标题",
  "content": "文章内容",
  "image": "/images/articles/unsplash-abc123.jpg",
  "imageSource": "unsplash",           // 图片来源
  "imageAuthor": "John Doe",           // 摄影师名字
  "imageAuthorUrl": "https://unsplash.com/@johndoe",  // 摄影师主页
  "unsplashUrl": "https://unsplash.com/photos/abc123"  // 图片页面
}
```

### 2. 数据来源

这些信息由 `article-generator.js` 中的 `getUniqueArticleImage()` 函数提供：

```javascript
// 使用 Unsplash 图片时返回
return {
  url: image.webPath,
  source: 'unsplash',
  author: image.author,
  authorUrl: image.authorUrl,
  unsplashUrl: image.unsplashUrl
};
```

---

## 🎨 前端实现要求

### 必须实现的功能

**在文章页面显示图片署名**，格式如下：

```html
<!-- 推荐格式 1: 图片下方 -->
<div class="image-attribution">
  Photo by <a href="{imageAuthorUrl}?utm_source=your_app&utm_medium=referral">{imageAuthor}</a> 
  on <a href="https://unsplash.com?utm_source=your_app&utm_medium=referral">Unsplash</a>
</div>

<!-- 推荐格式 2: 中文版本 -->
<div class="image-attribution">
  图片来自 <a href="{imageAuthorUrl}?utm_source=your_app&utm_medium=referral">{imageAuthor}</a> 
  在 <a href="https://unsplash.com?utm_source=your_app&utm_medium=referral">Unsplash</a>
</div>

<!-- 推荐格式 3: 简洁版 -->
<div class="image-attribution">
  <a href="{imageAuthorUrl}?utm_source=your_app&utm_medium=referral">{imageAuthor}</a> / 
  <a href="https://unsplash.com?utm_source=your_app&utm_medium=referral">Unsplash</a>
</div>
```

### CSS 样式建议

```css
.image-attribution {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
  text-align: right;
}

.image-attribution a {
  color: #666;
  text-decoration: none;
}

.image-attribution a:hover {
  color: #000;
  text-decoration: underline;
}
```

---

## 📱 实现位置

### 1. 文章详情页

**位置**: 在文章封面图片下方

```jsx
// React 示例
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <div className="image-attribution">
    Photo by <a href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`} target="_blank" rel="noopener noreferrer">
      {article.imageAuthor}
    </a> on <a href="https://unsplash.com?utm_source=shanyue&utm_medium=referral" target="_blank" rel="noopener noreferrer">
      Unsplash
    </a>
  </div>
)}
```

### 2. 文章列表页（可选）

如果列表页显示缩略图，也应该显示署名：

```jsx
// 简化版署名
{article.imageSource === 'unsplash' && (
  <div className="text-xs text-gray-500">
    <a href={article.imageAuthorUrl} target="_blank" rel="noopener noreferrer">
      {article.imageAuthor}
    </a>
  </div>
)}
```

---

## ⚡ 快速检查清单

在修改前端代码时，请确保：

- [ ] 检查文章数据中是否有 `imageSource` 字段
- [ ] 当 `imageSource === 'unsplash'` 时显示署名
- [ ] 包含摄影师名字（`imageAuthor`）
- [ ] 包含摄影师主页链接（`imageAuthorUrl`）
- [ ] 包含 "Unsplash" 文字和链接
- [ ] 链接包含 UTM 参数（`?utm_source=your_app&utm_medium=referral`）
- [ ] 链接使用 `target="_blank"` 和 `rel="noopener noreferrer"`
- [ ] 样式清晰可见但不抢眼

---

## 🚨 常见错误

### ❌ 错误示例 1: 没有显示署名
```jsx
// 错误：只显示图片，没有署名
<img src={article.image} alt={article.title} />
```

### ❌ 错误示例 2: 署名信息不完整
```jsx
// 错误：只显示 "Unsplash"，没有摄影师信息
<div>Photo from Unsplash</div>
```

### ❌ 错误示例 3: 没有链接
```jsx
// 错误：只显示文字，没有链接
<div>Photo by {article.imageAuthor} on Unsplash</div>
```

### ✅ 正确示例
```jsx
// 正确：完整的署名信息和链接
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <div className="text-sm text-gray-600 mt-2">
    Photo by{' '}
    <a 
      href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {article.imageAuthor}
    </a>
    {' '}on{' '}
    <a 
      href="https://unsplash.com?utm_source=shanyue&utm_medium=referral"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      Unsplash
    </a>
  </div>
)}
```

---

## 📚 参考资料

- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [Unsplash Attribution Guide](https://help.unsplash.com/en/articles/2511315-guideline-attribution)
- [Unsplash API Terms](https://unsplash.com/api-terms)

---

## 💡 给未来 AI 的提示

**当您需要修改前端代码以显示文章时：**

1. **首先检查**：文章数据中是否有 `imageSource`、`imageAuthor`、`imageAuthorUrl` 字段
2. **条件渲染**：只在 `imageSource === 'unsplash'` 时显示署名
3. **完整信息**：必须包含摄影师名字和链接，以及 Unsplash 链接
4. **UTM 参数**：链接中包含 `?utm_source=your_app&utm_medium=referral`
5. **样式设计**：署名信息应该清晰可见，但不影响文章阅读体验

**示例代码片段（复制即用）：**

```jsx
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <div className="text-sm text-gray-600 mt-2 text-right">
    Photo by{' '}
    <a 
      href={`${article.imageAuthorUrl}?utm_source=${YOUR_APP_NAME}&utm_medium=referral`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      {article.imageAuthor}
    </a>
    {' '}on{' '}
    <a 
      href={`https://unsplash.com?utm_source=${YOUR_APP_NAME}&utm_medium=referral`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline"
    >
      Unsplash
    </a>
  </div>
)}
```

**记得替换 `${YOUR_APP_NAME}` 为实际的应用名称！**

---

## 🎯 当前项目状态

### 后端（已完成 ✅）
- ✅ `article-generator.js` 已包含 Unsplash 署名信息
- ✅ 文章数据结构包含 `imageSource`、`imageAuthor`、`imageAuthorUrl`
- ✅ API 返回完整的署名数据

### 前端（需要实现 ⚠️）
- ⚠️ 需要在文章详情页显示署名
- ⚠️ 需要在文章列表页显示署名（可选）
- ⚠️ 需要添加适当的样式

**下一步**：修改前端代码，在文章页面显示 Unsplash 署名信息。

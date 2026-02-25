# 前端 Unsplash 署名实现指南

## 📋 任务概述

在闪阅（shanyue）前端项目中添加 Unsplash 图片署名显示，以符合 Unsplash API 使用条款。

**前端仓库**: https://github.com/xutomi3-art/shanyue

---

## 🎯 需要修改的文件

### 1. 文章详情页组件

**可能的文件位置**:
- `src/pages/ArticleDetail.jsx`
- `src/pages/NewsDetail.jsx`
- `src/components/ArticleView.jsx`
- `src/pages/[id].jsx` (如果使用动态路由)

### 2. 文章列表组件（可选）

**可能的文件位置**:
- `src/pages/News.jsx`
- `src/pages/ArticleList.jsx`
- `src/components/ArticleCard.jsx`

---

## 💻 实现代码

### 方案 1: React 组件（推荐）

创建一个可复用的署名组件：

```jsx
// src/components/UnsplashAttribution.jsx
import React from 'react';

export default function UnsplashAttribution({ article }) {
  // 只在图片来源是 Unsplash 时显示
  if (article.imageSource !== 'unsplash' || !article.imageAuthor) {
    return null;
  }

  return (
    <div className="text-sm text-gray-600 mt-2 text-right">
      图片来自{' '}
      <a
        href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:text-gray-900 transition-colors"
      >
        {article.imageAuthor}
      </a>
      {' '}在{' '}
      <a
        href="https://unsplash.com?utm_source=shanyue&utm_medium=referral"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:text-gray-900 transition-colors"
      >
        Unsplash
      </a>
    </div>
  );
}
```

### 方案 2: 内联实现

如果不想创建单独的组件，可以直接在文章详情页中添加：

```jsx
// 在文章详情页组件中
export default function ArticleDetail() {
  const [article, setArticle] = useState(null);
  
  // ... 获取文章数据的代码 ...
  
  return (
    <div className="article-detail">
      {/* 文章标题 */}
      <h1 className="text-3xl font-bold mb-4">{article.title}</h1>
      
      {/* 文章封面图 */}
      <div className="article-image mb-6">
        <img 
          src={article.imageUrl || article.image} 
          alt={article.title}
          className="w-full rounded-lg"
        />
        
        {/* Unsplash 署名 - 添加这部分 */}
        {article.imageSource === 'unsplash' && article.imageAuthor && (
          <div className="text-sm text-gray-600 mt-2 text-right">
            图片来自{' '}
            <a
              href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-gray-900"
            >
              {article.imageAuthor}
            </a>
            {' '}在{' '}
            <a
              href="https://unsplash.com?utm_source=shanyue&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline hover:text-gray-900"
            >
              Unsplash
            </a>
          </div>
        )}
      </div>
      
      {/* 文章内容 */}
      <div className="article-content">
        {article.content}
      </div>
    </div>
  );
}
```

### 方案 3: 英文版本

如果网站有英文版本：

```jsx
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <div className="text-sm text-gray-600 mt-2 text-right">
    Photo by{' '}
    <a
      href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline hover:text-gray-900"
    >
      {article.imageAuthor}
    </a>
    {' '}on{' '}
    <a
      href="https://unsplash.com?utm_source=shanyue&utm_medium=referral"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline hover:text-gray-900"
    >
      Unsplash
    </a>
  </div>
)}
```

---

## 🎨 样式选项

### 选项 1: Tailwind CSS（推荐）

```jsx
<div className="text-sm text-gray-600 mt-2 text-right">
  <a className="hover:underline hover:text-gray-900 transition-colors">
    {/* ... */}
  </a>
</div>
```

### 选项 2: 自定义 CSS

```css
/* src/styles/attribution.css */
.unsplash-attribution {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.5rem;
  text-align: right;
}

.unsplash-attribution a {
  color: #666;
  text-decoration: none;
  transition: color 0.2s;
}

.unsplash-attribution a:hover {
  color: #000;
  text-decoration: underline;
}
```

```jsx
<div className="unsplash-attribution">
  {/* ... */}
</div>
```

### 选项 3: 内联样式

```jsx
<div style={{
  fontSize: '14px',
  color: '#666',
  marginTop: '8px',
  textAlign: 'right'
}}>
  <a style={{
    color: '#666',
    textDecoration: 'none'
  }}>
    {/* ... */}
  </a>
</div>
```

---

## 📱 响应式设计

### 移动端优化

```jsx
<div className="text-xs sm:text-sm text-gray-600 mt-2 text-right px-4 sm:px-0">
  图片来自{' '}
  <a
    href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline"
  >
    {article.imageAuthor}
  </a>
  {' '}在{' '}
  <a
    href="https://unsplash.com?utm_source=shanyue&utm_medium=referral"
    target="_blank"
    rel="noopener noreferrer"
    className="hover:underline"
  >
    Unsplash
  </a>
</div>
```

---

## 🔍 数据字段检查

### 后端返回的文章数据结构

```javascript
{
  "id": "1735123456789",
  "title": "AI阅卷革命：如何利用智能阅卷系统提升教学效率",
  "content": "文章内容...",
  "imageUrl": "/images/articles/unsplash-abc123.jpg",  // 或 image
  "imageSource": "unsplash",           // 关键字段
  "imageAuthor": "John Doe",           // 摄影师名字
  "imageAuthorUrl": "https://unsplash.com/@johndoe",  // 摄影师主页
  "imageUnsplashUrl": "https://unsplash.com/photos/abc123",  // 图片页面
  "keyword": "AI阅卷",
  "createdAt": "2026-02-25T10:00:00.000Z",
  "published": true,
  "type": "ai_generated"
}
```

### 字段兼容性处理

```jsx
// 处理可能的字段名差异
const imageUrl = article.imageUrl || article.image;
const authorUrl = article.imageAuthorUrl || article.authorUrl;
const unsplashUrl = article.imageUnsplashUrl || article.unsplashUrl;
```

---

## ✅ 实现步骤

### 步骤 1: 找到文章详情页组件

```bash
# 在项目根目录执行
cd /path/to/shanyue
find src -name "*Article*" -o -name "*News*" -o -name "*Detail*"
```

### 步骤 2: 检查文章数据结构

在组件中添加 console.log 查看数据：

```jsx
useEffect(() => {
  // 获取文章数据后
  console.log('Article data:', article);
  console.log('Image source:', article.imageSource);
  console.log('Image author:', article.imageAuthor);
}, [article]);
```

### 步骤 3: 添加署名组件

在文章封面图片后面添加署名代码（见上面的方案）

### 步骤 4: 测试显示效果

1. 启动开发服务器：`npm run dev`
2. 访问一篇文章详情页
3. 检查图片下方是否显示署名
4. 点击链接确认跳转正确

### 步骤 5: 部署到生产环境

```bash
# 构建生产版本
npm run build

# 部署到服务器
scp -r dist/* root@47.239.221.187:/var/www/shanyue/dist/
```

---

## 🚨 常见问题

### 问题 1: 署名不显示

**原因**: 文章数据中缺少 `imageSource` 或 `imageAuthor` 字段

**解决**:
1. 检查后端API返回的数据
2. 确认后端已更新到最新版本
3. 重新生成文章以获取完整数据

### 问题 2: 链接无法点击

**原因**: 缺少 `target="_blank"` 或链接格式错误

**解决**:
```jsx
<a
  href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`}
  target="_blank"  // 必须添加
  rel="noopener noreferrer"  // 安全性
>
```

### 问题 3: 样式不美观

**解决**: 调整 CSS 类名或内联样式

```jsx
// 更醒目的样式
<div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mt-3">
  {/* ... */}
</div>

// 更低调的样式
<div className="text-xs text-gray-400 mt-1 opacity-75">
  {/* ... */}
</div>
```

---

## 📸 效果预览

### 桌面端效果

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [文章封面图片]                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                    图片来自 John Doe 在 Unsplash
                         ↑链接    ↑链接
```

### 移动端效果

```
┌──────────────────────────┐
│                          │
│    [文章封面图片]        │
│                          │
└──────────────────────────┘
  图片来自 John Doe 在 
  Unsplash
```

---

## 🎯 验证清单

部署后，请验证以下内容：

- [ ] 文章详情页显示 Unsplash 署名
- [ ] 署名包含摄影师名字和链接
- [ ] 署名包含 "Unsplash" 文字和链接
- [ ] 链接包含 UTM 参数
- [ ] 链接在新标签页打开
- [ ] 移动端显示正常
- [ ] 只有 Unsplash 图片显示署名（AI生成的图片不显示）
- [ ] 样式美观，不影响阅读体验

---

## 📚 相关文档

- [Unsplash Attribution Guide](https://help.unsplash.com/en/articles/2511315-guideline-attribution)
- [Unsplash API Guidelines](https://help.unsplash.com/en/articles/2511245-unsplash-api-guidelines)
- [后端 Unsplash 配置文档](./UNSPLASH_ATTRIBUTION.md)

---

## 💡 快速复制代码

**最简单的实现（复制即用）**:

```jsx
{article.imageSource === 'unsplash' && article.imageAuthor && (
  <div className="text-sm text-gray-600 mt-2 text-right">
    图片来自{' '}
    <a href={`${article.imageAuthorUrl}?utm_source=shanyue&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="hover:underline">
      {article.imageAuthor}
    </a>
    {' '}在{' '}
    <a href="https://unsplash.com?utm_source=shanyue&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="hover:underline">
      Unsplash
    </a>
  </div>
)}
```

**将这段代码添加到文章封面图片的下方即可！**

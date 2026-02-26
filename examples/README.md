# 前端对接示例 (Frontend Integration Examples)

本目录包含了多种前端技术栈对接通用Web后端的示例代码。

---

## 📁 文件列表

| 文件 | 技术栈 | 描述 |
|------|--------|------|
| `quick-start.html` | 纯HTML+JS | 最简单的示例，无需构建工具 |
| `ContactForm.tsx` | React + TypeScript | React组件示例 |

---

## 🚀 快速开始

### 1. 纯HTML示例 (`quick-start.html`)

**适用场景**: 快速测试、学习API、静态网站

**使用方法**:
1. 确保后端服务已启动在 `http://localhost:3001`
2. 在浏览器中直接打开 `quick-start.html`
3. 填写表单并提交，查看浏览器控制台的API调用日志

**特点**:
- ✅ 无需安装任何依赖
- ✅ 包含完整的UI和交互
- ✅ 控制台输出详细的API调用代码
- ✅ 适合学习和调试

### 2. React + TypeScript示例 (`ContactForm.tsx`)

**适用场景**: React项目、TypeScript项目

**使用方法**:
1. 将 `ContactForm.tsx` 复制到你的React项目中
2. 将 `../types/api.ts` 复制到你的项目
3. 在需要的地方导入并使用:
   ```tsx
   import ContactForm from './ContactForm';
   
   function App() {
     return (
       <ContactForm 
         onSuccess={() => console.log('提交成功')}
         onError={(error) => console.error(error)}
       />
     );
   }
   ```

**特点**:
- ✅ 完整的TypeScript类型支持
- ✅ React Hooks最佳实践
- ✅ 包含错误处理和加载状态
- ✅ 可自定义样式

---

## 🔧 配置说明

### API地址配置

所有示例中的 `API_BASE` 变量需要根据你的环境进行配置：

**开发环境**:
```javascript
const API_BASE = '/api';  // 使用相对路径，通过代理访问
```

**生产环境**:
```javascript
const API_BASE = 'https://your-domain.com/api';  // 使用完整URL
```

### 代理配置

为了避免CORS问题，建议在开发环境中配置代理。

**Vite (`vite.config.js`)**:
```javascript
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
}
```

**Next.js (`next.config.js`)**:
```javascript
module.exports = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*'
      }
    ]
  }
}
```

---

## 📚 更多资源

- **[API文档](../docs/API.md)** - 完整的API接口说明
- **[前端对接指南](../docs/FRONTEND_GUIDE.md)** - 详细的对接指南
- **[安全配置指南](../docs/SECURITY.md)** - 安全相关的配置
- **[客户端SDK](../docs/client-sdk.ts)** - 类型安全的API封装

---

## ❓ 常见问题

**Q: 为什么会出现CORS错误？**

A: 请检查：
1. 后端是否已启动
2. 前端代理是否配置正确
3. 后端CORS白名单是否包含你的域名

**Q: 验证码显示不出来？**

A: 请检查：
1. 后端 `/api/captcha` 接口是否正常
2. 浏览器控制台是否有错误信息
3. 网络请求是否成功

**Q: 表单提交失败？**

A: 请检查：
1. 所有必填字段是否已填写
2. 验证码是否正确
3. 后端SMTP配置是否正确
4. 浏览器控制台的错误信息

---

**最后更新**: 2026-02-26

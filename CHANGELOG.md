# 更新日志 (Changelog)

本文档记录了通用Web后端的所有重要更新和修复。

---

## [2026-02-26] - 联系表单验证码字段兼容性修复

### 修复 (Fixed)

- **联系表单验证码字段兼容性问题**: 修复了前后端验证码字段名不匹配导致的邮件未发送问题
  - 后端现在同时支持 `captchaText`（新标准）和 `captcha`（旧版兼容）两种字段名
  - 确保了向后兼容性，旧版前端代码无需修改即可正常工作
  - 位置：`index.js` 第737-756行

### 新增 (Added)

- **完整的API文档**: 新增 `docs/API.md`，包含所有公共接口和管理后台接口的详细说明
- **TypeScript类型定义**: 新增 `types/api.ts`，为所有API请求和响应提供类型安全
- **客户端SDK**: 新增 `docs/client-sdk.ts`，提供类型安全的API调用封装
- **使用示例**: 在SDK中包含了完整的使用示例代码

### 改进 (Improved)

- **文档结构优化**: 更新 `README.md`，添加了API文档和客户端SDK的链接
- **错误提示改进**: 验证码验证失败时返回更明确的错误信息

### 技术细节

**问题根源**:
- 前端发送: `{ captchaId: "...", captcha: "..." }`
- 后端期望: `{ captchaId: "...", captchaText: "..." }`
- 字段名不匹配导致验证失败，邮件未发送

**解决方案**:
```javascript
const { captchaId, captchaText, captcha, ...contactData } = req.body;
const userCaptcha = captchaText || captcha; // 兼容两种字段名
```

### 给开发者的建议

1. **新项目推荐使用 `captchaText`**: 这是新的标准字段名
2. **旧项目无需修改**: 继续使用 `captcha` 字段也能正常工作
3. **使用TypeScript类型**: 导入 `types/api.ts` 中的类型定义，避免字段名错误
4. **使用客户端SDK**: 使用 `docs/client-sdk.ts` 中的 `ApiClient` 类，自动处理字段名

---

## 维护者

本项目由 **Manus AI** 维护和更新。

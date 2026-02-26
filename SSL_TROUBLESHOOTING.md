# SSL证书管理故障排除

## 问题：SSL证书状态一直显示"加载中..."

### 现象

后台管理系统「系统设置」页面中，SSL 证书状态区域所有字段（域名、证书到期时间、剩余天数）均显示"加载中..."，无法正常显示。

### 根本原因

服务器上部署的 `cert-manager.js` 是一个占位版本（Stub），并非完整实现。该占位文件仅包含以下内容：

```javascript
async function renewCertificate() {
  return { success: false, message: '证书管理未配置' };
}

async function getCertificateInfo() {
  return { success: false, message: '证书管理未配置' };
}

module.exports = {
  renewCertificate,
  getCertificateInfo
};
```

该文件缺少 `getSSLStatus` 函数的导出，而 `index.js` 中的 `/api/admin/ssl-status` 接口尝试调用 `getSSLStatus()`，导致运行时报错 `getSSLStatus is not a function`，前端因此无法获取证书信息，页面一直停留在"加载中..."状态。

### 解决方案

在每次部署时，确保将 GitHub 仓库中完整版的 `cert-manager.js`（包含 `getSSLStatus`、`renewCertificate`、`getCertificateInfo` 三个函数的完整实现）一并同步到服务器，不应使用占位版本替代。

### 验证方法

```bash
# 1. 检查服务器上的cert-manager.js文件大小（完整版约5.6KB）
ls -lh /var/www/tongyong-web-backend/cert-manager.js

# 2. 检查文件中是否包含getSSLStatus函数
grep "getSSLStatus" /var/www/tongyong-web-backend/cert-manager.js

# 3. 检查module.exports是否导出了所有三个函数
grep -A 5 "module.exports" /var/www/tongyong-web-backend/cert-manager.js
```

**预期输出**：
- 文件大小应该是 5.6KB 左右（不是几百字节）
- 应该找到 `getSSLStatus` 函数定义
- `module.exports` 应该包含所有三个函数

### 部署检查清单

在部署时，请确保：

- [ ] 从GitHub拉取最新代码：`git pull origin main`
- [ ] 确认 `cert-manager.js` 文件存在且完整
- [ ] 验证文件大小约为 5.6KB
- [ ] 重启服务：`pm2 restart tongyong-web-backend`
- [ ] 访问后台系统设置页面，确认SSL证书状态正常显示

### 建议

在部署脚本或 CI/CD 流程中增加对该文件的检查，确保所有导出函数均存在且为完整实现。

```bash
# 部署脚本示例
#!/bin/bash
cd /var/www/tongyong-web-backend
git pull origin main

# 检查cert-manager.js是否完整
if ! grep -q "getSSLStatus" cert-manager.js; then
  echo "错误：cert-manager.js 缺少 getSSLStatus 函数"
  exit 1
fi

npm install
pm2 restart tongyong-web-backend
```

# 部署检查清单

## 部署前准备

### 配置文件清理

- [ ] **清空品牌信息**：`brandConfig` 中的 `name`、`description`、`adminTitle` 应使用通用占位符
- [ ] **清空SEO关键词**：`seoConfig.keywords` 应为空字符串
- [ ] **清空默认文章**：`data/articles.json` 应为空数组 `[]`
- [ ] **清空留言记录**：`data/contacts.json` 应为空数组 `[]`
- [ ] **重置管理员密码**：使用通用的默认密码，并标记 `needsPasswordChange: true`

### 文件完整性检查

- [ ] **cert-manager.js**：确认文件大小约5.6KB，包含 `getSSLStatus` 函数
- [ ] **feishu-integration.js**：确认包含 `deviceType` 字段映射
- [ ] **index.js**：确认包含设备检测代码

## 部署步骤

### 1. 代码同步

```bash
cd /var/www/tongyong-web-backend
git pull origin main
```

### 2. 依赖安装

```bash
npm install
```

### 3. 配置文件

```bash
# 复制配置模板
cp data/config.example.json data/config.json

# 编辑配置文件，填入实际的API密钥、邮箱等信息
nano data/config.json
```

**必须配置的字段**：
- `brandConfig.name` - 品牌名称
- `brandConfig.description` - 品牌描述
- `brandConfig.adminTitle` - 后台标题
- `brandConfig.websiteUrl` - 网站URL
- `emailConfig` - 邮箱配置
- `llmConfig` - LLM API配置
- `imageConfig.unsplashApiKey` - Unsplash API密钥

### 4. 数据文件初始化

```bash
# 确保数据目录存在
mkdir -p data

# 初始化空数据文件
echo "[]" > data/articles.json
echo "[]" > data/contacts.json
echo "[]" > data/messages.json
echo "[]" > data/used-unsplash-images.json
echo "[]" > data/used-urls.json
```

### 5. 启动服务

```bash
# 使用PM2启动
pm2 start index.js --name "your-project-name"

# 保存PM2配置
pm2 save
```

### 6. Nginx配置

```bash
# 编辑Nginx配置
sudo nano /etc/nginx/sites-available/your-domain.conf

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 7. SSL证书

```bash
# 使用Certbot获取证书
sudo certbot --nginx -d your-domain.com

# 设置环境变量（可选）
export DOMAIN=your-domain.com
```

## 部署后验证

### 功能测试

- [ ] **后台访问**：访问 `https://your-domain.com/admin/` 确认能正常打开
- [ ] **管理员登录**：使用默认账号登录，确认能正常进入
- [ ] **品牌显示**：确认后台标题显示为您配置的品牌名称
- [ ] **SSL证书状态**：在系统设置页面，确认SSL证书信息正常显示（不是"加载中..."）
- [ ] **联系表单**：提交测试留言，确认能收到邮件通知
- [ ] **飞书集成**：确认留言能同步到飞书表格（如果配置了）
- [ ] **设备检测**：确认留言记录和飞书表格中包含"客户端类型"字段

### API测试

```bash
# 测试验证码API
curl https://your-domain.com/api/captcha

# 测试文章列表API
curl https://your-domain.com/api/articles

# 测试SSL状态API（需要登录Token）
curl -H "Authorization: Bearer YOUR_TOKEN" https://your-domain.com/api/admin/ssl-status
```

## 常见问题

### 问题1：后台显示旧的品牌名称

**原因**：导入了包含旧品牌信息的配置文件

**解决**：
1. 编辑 `data/config.json`
2. 修改 `brandConfig` 中的所有字段
3. 重启服务：`pm2 restart your-project-name`

### 问题2：后台有默认文章

**原因**：`data/articles.json` 包含了示例文章

**解决**：
1. 清空文章文件：`echo "[]" > data/articles.json`
2. 重启服务：`pm2 restart your-project-name`

### 问题3：SSL证书状态显示"加载中..."

**原因**：`cert-manager.js` 文件不完整

**解决**：参考 [SSL_TROUBLESHOOTING.md](./SSL_TROUBLESHOOTING.md)

### 问题4：前端路由冲突

**原因**：前端SPA路由拦截了 `/admin/` 路径

**解决**：参考 [DEPLOYMENT.md](./DEPLOYMENT.md) 中的"前端路由集成要求"部分

## 安全建议

- [ ] 首次登录后立即修改管理员密码
- [ ] 配置强密码策略
- [ ] 定期备份 `data/` 目录
- [ ] 定期更新依赖包：`npm update`
- [ ] 监控服务器日志：`pm2 logs`
- [ ] 设置防火墙规则，只开放必要的端口

## 维护建议

- [ ] 每周检查SSL证书有效期
- [ ] 每月检查并更新依赖包
- [ ] 定期备份配置文件和数据文件
- [ ] 监控服务器资源使用情况
- [ ] 定期查看错误日志

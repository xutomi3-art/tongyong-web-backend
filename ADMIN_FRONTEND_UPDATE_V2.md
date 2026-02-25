# 管理后台前端更新指南 V2

本文档说明如何更新 `frontend/admin.html`，添加以下功能：

1. 首次登录强制修改密码弹窗
2. 管理员管理界面（包含邀请功能）
3. 来源追踪显示

---

## 1. 管理员管理界面（系统设置Tab）

### 位置

在"系统设置"Tab中，"修改登录密码"部分下方添加"管理员管理"部分。

### HTML代码

在"修改登录密码"的 `</div>` 后添加：

```html
<!-- 管理员管理 -->
<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
  <h2 class="text-xl font-semibold mb-4 flex items-center">
    <span class="text-2xl mr-2">👥</span>
    管理员管理
  </h2>
  
  <!-- 邀请新管理员 -->
  <div class="mb-6 p-4 bg-purple-50 rounded-lg">
    <h3 class="text-lg font-medium mb-3">邀请新管理员</h3>
    <form id="inviteAdminForm" class="space-y-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
          <input
            type="email"
            id="inviteEmail"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="admin@example.com"
            required
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">姓名</label>
          <input
            type="text"
            id="inviteName"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            placeholder="张三"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
      >
        📧 发送邀请邮件
      </button>
    </form>
  </div>
  
  <!-- 管理员列表 -->
  <div>
    <h3 class="text-lg font-medium mb-3">当前管理员</h3>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">邮箱</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">角色</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody id="adminsList" class="bg-white divide-y divide-gray-200">
          <!-- 动态加载 -->
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### JavaScript代码

在 `<script>` 标签中添加：

```javascript
// 加载管理员列表
async function loadAdmins() {
  try {
    const response = await fetch('/api/admin/admins', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const adminsList = document.getElementById('adminsList');
      const currentEmail = localStorage.getItem('adminEmail');
      
      adminsList.innerHTML = data.admins.map(admin => `
        <tr>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            ${admin.email}
            ${admin.email === currentEmail ? '<span class="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">当前账号</span>' : ''}
          </td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${admin.name}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${admin.role === 'admin' ? '管理员' : admin.role}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(admin.createdAt).toLocaleString('zh-CN')}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm">
            ${admin.email !== currentEmail ? `
              <button
                onclick="deleteAdmin('${admin.email}')"
                class="text-red-600 hover:text-red-800"
              >
                删除
              </button>
            ` : '<span class="text-gray-400">-</span>'}
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading admins:', error);
  }
}

// 邀请管理员
document.getElementById('inviteAdminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('inviteEmail').value;
  const name = document.getElementById('inviteName').value;
  
  try {
    const response = await fetch('/api/admin/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ email, name })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('邀请邮件已发送！');
      document.getElementById('inviteEmail').value = '';
      document.getElementById('inviteName').value = '';
    } else {
      alert(data.message || '发送邀请失败');
    }
  } catch (error) {
    console.error('Error inviting admin:', error);
    alert('发送邀请失败');
  }
});

// 删除管理员
async function deleteAdmin(email) {
  if (!confirm(`确定要删除管理员 ${email} 吗？`)) {
    return;
  }
  
  try {
    const response = await fetch(`/api/admin/admins/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('删除成功');
      loadAdmins();
    } else {
      alert(data.message || '删除失败');
    }
  } catch (error) {
    console.error('Error deleting admin:', error);
    alert('删除失败');
  }
}

// 在页面加载时调用
loadAdmins();
```

---

## 2. 首次登录强制修改密码弹窗

### HTML代码

在 `<body>` 标签内，最顶部添加：

```html
<!-- 首次登录强制修改密码弹窗 -->
<div id="changePasswordModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
    <h2 class="text-2xl font-bold mb-4">🔐 请修改您的密码</h2>
    <p class="text-gray-600 mb-6">
      为了账号安全，请在首次登录时修改密码。
    </p>
    
    <form id="forceChangePasswordForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
        <input
          type="password"
          id="forceCurrentPassword"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          required
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
        <input
          type="password"
          id="forceNewPassword"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="至少8位，包含字母和数字"
          required
          minlength="8"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
        <input
          type="password"
          id="forceConfirmPassword"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          required
          minlength="8"
        />
      </div>
      
      <div id="forceChangePasswordError" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"></div>
      
      <button
        type="submit"
        class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition"
      >
        修改密码
      </button>
    </form>
  </div>
</div>
```

### JavaScript代码

在 `<script>` 标签中添加：

```javascript
// 检查是否需要强制修改密码
async function checkPasswordChange() {
  try {
    const response = await fetch('/api/admin/verify', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.needsPasswordChange) {
      // 显示强制修改密码弹窗
      document.getElementById('changePasswordModal').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error checking password change:', error);
  }
}

// 处理强制修改密码
document.getElementById('forceChangePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const currentPassword = document.getElementById('forceCurrentPassword').value;
  const newPassword = document.getElementById('forceNewPassword').value;
  const confirmPassword = document.getElementById('forceConfirmPassword').value;
  
  const errorDiv = document.getElementById('forceChangePasswordError');
  errorDiv.classList.add('hidden');
  
  // 验证密码
  if (newPassword.length < 8) {
    errorDiv.textContent = '密码至少8位';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    errorDiv.textContent = '密码必须包含字母和数字';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    errorDiv.textContent = '两次输入的密码不一致';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  try {
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 更新token
      localStorage.setItem('adminToken', data.token);
      
      // 隐藏弹窗
      document.getElementById('changePasswordModal').classList.add('hidden');
      
      alert('密码修改成功！');
    } else {
      errorDiv.textContent = data.message || '修改密码失败';
      errorDiv.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error changing password:', error);
    errorDiv.textContent = '修改密码失败，请稍后重试';
    errorDiv.classList.remove('hidden');
  }
});

// 页面加载时检查
checkPasswordChange();
```

---

## 3. 来源追踪显示（留言管理Tab）

### 修改留言列表显示

找到留言列表的表格，在"来源"列中显示追踪信息。

### 修改JavaScript

在加载留言列表的函数中，修改"来源"列的显示：

```javascript
// 原来的代码：
<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${message.source || '-'}</td>

// 改为：
<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
  ${message.sourceDisplay || message.source || '🌐 直接访问'}
  ${message.utmData && message.utmData.utm_campaign ? `<br><span class="text-xs text-gray-400">活动：${message.utmData.utm_campaign}</span>` : ''}
</td>
```

---

## 4. 测试清单

### 管理员邀请功能

- [ ] 在系统设置中输入邮箱和姓名
- [ ] 点击"发送邀请邮件"
- [ ] 检查是否收到邀请邮件
- [ ] 点击邮件中的链接
- [ ] 验证是否跳转到 accept-invite.html
- [ ] 设置密码并提交
- [ ] 验证是否自动登录并跳转到管理后台
- [ ] 在管理员列表中查看新管理员
- [ ] 删除测试管理员

### 首次登录强制修改密码

- [ ] 使用默认账号 test@abc.com / Test123 登录
- [ ] 验证是否弹出强制修改密码窗口
- [ ] 修改密码
- [ ] 验证弹窗是否关闭
- [ ] 刷新页面，验证不再弹出

### 来源追踪显示

- [ ] 通过百度广告链接提交留言
- [ ] 在留言管理中查看来源是否显示"💰 百度广告"
- [ ] 查看是否显示活动名称

---

## 5. 注意事项

1. **邀请链接有效期**：24小时，过期后需要重新发送
2. **邮件配置**：确保 emailConfig 配置正确，否则无法发送邀请邮件
3. **不能删除自己**：当前登录的管理员不能删除自己的账号
4. **至少保留一个管理员**：系统至少需要一个管理员账号

---

## 6. API参考

| API | 方法 | 功能 |
|-----|------|------|
| `/api/admin/invite` | POST | 发送管理员邀请 |
| `/api/admin/verify-invite/:token` | GET | 验证邀请token |
| `/api/admin/accept-invite` | POST | 接受邀请并设置密码 |
| `/api/admin/admins` | GET | 获取管理员列表 |
| `/api/admin/admins/:email` | DELETE | 删除管理员 |

---

完成以上修改后，管理后台将拥有完整的管理员邀请和管理功能！

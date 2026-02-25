# 管理后台前端更新指南

本文档说明如何更新 `frontend/admin.html`，以支持新的邮箱登录系统和管理员管理功能。

## 概述

新的登录系统已经实现了以下后端功能：

1. **邮箱登录**：使用邮箱+密码登录（替代用户名+密码）
2. **忘记密码**：通过邮件发送一次性密码
3. **多管理员管理**：支持多个管理员账号
4. **首次登录强制修改密码**：使用默认密码或一次性密码登录后必须修改密码

## 需要添加的功能

### 1. 首次登录强制修改密码弹窗

**位置**：页面加载时检查

**实现步骤**：

1. 在页面加载时检查 `localStorage.getItem('needsPasswordChange')`
2. 如果为 `'true'`，显示一个模态弹窗，要求用户修改密码
3. 弹窗应该：
   - 不可关闭（没有关闭按钮）
   - 包含三个输入框：当前邮箱（只读）、新密码、确认新密码
   - 新密码必须至少8位，包含字母和数字
   - 两次输入的新密码必须一致
   - 提交后调用 `/api/admin/change-password` API
   - 成功后清除 `localStorage.getItem('needsPasswordChange')`

**HTML代码示例**：

```html
<!-- 强制修改密码弹窗 -->
<div id="forcePasswordChangeModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-8 max-w-md w-full">
    <h2 class="text-2xl font-bold text-gray-800 mb-4">⚠️ 请修改密码</h2>
    <p class="text-gray-600 mb-6">
      为了您的账号安全，首次登录后必须修改密码。
    </p>
    
    <form id="forcePasswordChangeForm" class="space-y-4">
      <!-- 邮箱（只读） -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
        <input
          type="email"
          id="forceChangeEmail"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          readonly
        />
      </div>
      
      <!-- 新密码 -->
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
      
      <!-- 确认新密码 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
        <input
          type="password"
          id="forceConfirmPassword"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="再次输入新密码"
          required
          minlength="8"
        />
      </div>
      
      <!-- 错误提示 -->
      <div id="forcePasswordError" class="hidden bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"></div>
      
      <!-- 提交按钮 -->
      <button
        type="submit"
        class="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700"
      >
        修改密码
      </button>
    </form>
  </div>
</div>
```

**JavaScript代码示例**：

```javascript
// 检查是否需要强制修改密码
function checkForcePasswordChange() {
  const needsChange = localStorage.getItem('needsPasswordChange');
  const adminEmail = localStorage.getItem('adminEmail');
  
  if (needsChange === 'true' && adminEmail) {
    const modal = document.getElementById('forcePasswordChangeModal');
    const emailInput = document.getElementById('forceChangeEmail');
    
    emailInput.value = adminEmail;
    modal.classList.remove('hidden');
    
    // 处理表单提交
    const form = document.getElementById('forcePasswordChangeForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const newPassword = document.getElementById('forceNewPassword').value;
      const confirmPassword = document.getElementById('forceConfirmPassword').value;
      const errorDiv = document.getElementById('forcePasswordError');
      
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
      
      // 获取当前密码（从token中解析）
      const token = localStorage.getItem('adminToken');
      const decoded = atob(token);
      const [email, oldPassword] = decoded.split(':');
      
      // 调用API修改密码
      try {
        const response = await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            email: adminEmail,
            oldPassword: oldPassword,
            newPassword: newPassword
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // 更新token
          const newToken = btoa(`${adminEmail}:${newPassword}`);
          localStorage.setItem('adminToken', newToken);
          localStorage.removeItem('needsPasswordChange');
          
          // 关闭弹窗
          modal.classList.add('hidden');
          
          // 显示成功提示
          alert('密码修改成功！');
        } else {
          errorDiv.textContent = data.message || '修改失败';
          errorDiv.classList.remove('hidden');
        }
      } catch (error) {
        console.error('Change password error:', error);
        errorDiv.textContent = '修改失败，请稍后重试';
        errorDiv.classList.remove('hidden');
      }
    });
  }
}

// 页面加载时检查
document.addEventListener('DOMContentLoaded', () => {
  checkForcePasswordChange();
});
```

### 2. 系统设置中的管理员管理界面

**位置**：系统设置Tab中，在"修改登录密码"下方

**功能**：

1. 显示所有管理员列表（邮箱、姓名、创建时间）
2. 添加新管理员
3. 删除管理员（不能删除最后一个）

**HTML代码示例**：

```html
<!-- 管理员管理 -->
<div class="bg-white rounded-lg shadow-md p-6 mb-6">
  <h3 class="text-xl font-semibold text-gray-800 mb-4 flex items-center">
    <span class="text-2xl mr-2">👥</span>
    管理员管理
  </h3>
  
  <!-- 添加管理员表单 -->
  <div class="mb-6 p-4 bg-gray-50 rounded-lg">
    <h4 class="font-medium text-gray-700 mb-3">添加新管理员</h4>
    <form id="addAdminForm" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        type="email"
        id="newAdminEmail"
        placeholder="邮箱"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        required
      />
      <input
        type="text"
        id="newAdminName"
        placeholder="姓名"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        required
      />
      <input
        type="password"
        id="newAdminPassword"
        placeholder="初始密码"
        class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        required
        minlength="8"
      />
      <button
        type="submit"
        class="md:col-span-3 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
      >
        添加管理员
      </button>
    </form>
  </div>
  
  <!-- 管理员列表 -->
  <div>
    <h4 class="font-medium text-gray-700 mb-3">管理员列表</h4>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-100">
          <tr>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">邮箱</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">姓名</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">创建时间</th>
            <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">操作</th>
          </tr>
        </thead>
        <tbody id="adminListBody">
          <!-- 动态加载 -->
        </tbody>
      </table>
    </div>
  </div>
</div>
```

**JavaScript代码示例**：

```javascript
// 加载管理员列表
async function loadAdmins() {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/admin/admins', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const tbody = document.getElementById('adminListBody');
      const currentEmail = localStorage.getItem('adminEmail');
      
      tbody.innerHTML = data.admins.map(admin => `
        <tr class="border-b hover:bg-gray-50">
          <td class="px-4 py-3 text-sm">${admin.email}</td>
          <td class="px-4 py-3 text-sm">${admin.name}</td>
          <td class="px-4 py-3 text-sm">${new Date(admin.createdAt).toLocaleDateString('zh-CN')}</td>
          <td class="px-4 py-3 text-sm">
            ${admin.email === currentEmail ? 
              '<span class="text-gray-400">当前账号</span>' :
              `<button onclick="deleteAdmin('${admin.email}')" class="text-red-600 hover:text-red-700">删除</button>`
            }
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Load admins error:', error);
  }
}

// 添加管理员
document.getElementById('addAdminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('newAdminEmail').value;
  const name = document.getElementById('newAdminName').value;
  const password = document.getElementById('newAdminPassword').value;
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/admin/admins', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, name, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('管理员添加成功');
      document.getElementById('addAdminForm').reset();
      loadAdmins();
    } else {
      alert(data.message || '添加失败');
    }
  } catch (error) {
    console.error('Add admin error:', error);
    alert('添加失败，请稍后重试');
  }
});

// 删除管理员
async function deleteAdmin(email) {
  if (!confirm(`确定要删除管理员 ${email} 吗？`)) {
    return;
  }
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`/api/admin/admins/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('管理员删除成功');
      loadAdmins();
    } else {
      alert(data.message || '删除失败');
    }
  } catch (error) {
    console.error('Delete admin error:', error);
    alert('删除失败，请稍后重试');
  }
}

// 在系统设置Tab激活时加载管理员列表
// 需要在Tab切换逻辑中添加：
// if (tabName === '系统设置') {
//   loadAdmins();
// }
```

### 3. 更新现有的修改密码功能

**位置**：系统设置Tab中的"修改登录密码"部分

**需要修改**：

1. 将"当前密码"、"新密码"改为"旧密码"、"新密码"
2. 添加"确认新密码"输入框
3. 更新API调用，传入 `email` 参数

**修改后的代码示例**：

```javascript
// 修改密码表单提交
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const adminEmail = localStorage.getItem('adminEmail');
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  // 验证新密码
  if (newPassword.length < 8) {
    alert('新密码至少8位');
    return;
  }
  
  if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    alert('新密码必须包含字母和数字');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    alert('两次输入的新密码不一致');
    return;
  }
  
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: adminEmail,
        oldPassword: oldPassword,
        newPassword: newPassword
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // 更新token
      const newToken = btoa(`${adminEmail}:${newPassword}`);
      localStorage.setItem('adminToken', newToken);
      
      alert('密码修改成功');
      document.getElementById('changePasswordForm').reset();
    } else {
      alert(data.message || '修改失败');
    }
  } catch (error) {
    console.error('Change password error:', error);
    alert('修改失败，请稍后重试');
  }
});
```

## AI操作指南

当AI需要更新 `frontend/admin.html` 时，应该：

1. **读取本文档**：了解需要添加的功能
2. **读取 `frontend/admin.html`**：了解现有结构
3. **定位插入位置**：
   - 首次登录弹窗：在 `<body>` 标签后立即添加
   - 管理员管理界面：在系统设置Tab的"修改登录密码"下方添加
4. **添加HTML代码**：复制本文档中的HTML代码示例
5. **添加JavaScript代码**：复制本文档中的JavaScript代码示例
6. **测试功能**：确保所有功能正常工作

## 注意事项

1. **安全性**：密码必须至少8位，包含字母和数字
2. **用户体验**：首次登录弹窗不可关闭，确保用户修改密码
3. **权限控制**：不能删除最后一个管理员
4. **当前账号**：不能删除当前登录的账号
5. **Token更新**：修改密码后必须更新localStorage中的token

## 测试清单

- [ ] 使用默认账号 test@abc.com / Test123 登录
- [ ] 验证首次登录弹窗是否显示
- [ ] 修改密码后弹窗是否关闭
- [ ] 修改密码后是否可以正常使用后台
- [ ] 忘记密码功能是否正常
- [ ] 一次性密码登录是否正常
- [ ] 管理员列表是否正常显示
- [ ] 添加管理员是否成功
- [ ] 删除管理员是否成功
- [ ] 不能删除最后一个管理员
- [ ] 不能删除当前登录账号

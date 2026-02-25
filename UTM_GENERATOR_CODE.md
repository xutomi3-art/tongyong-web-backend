# UTM链接生成器代码

本文档包含UTM链接生成器的完整HTML和JavaScript代码，需要添加到 `frontend/admin.html` 的"留言管理"Tab中。

---

## 1. HTML代码

在"留言管理"Tab中，留言列表 (`<div id="messagesList">`) **之前**添加以下代码：

```html
<!-- UTM链接生成器 -->
<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
  <div class="flex items-center justify-between mb-4 cursor-pointer" onclick="toggleUtmGenerator()">
    <h2 class="text-xl font-semibold flex items-center">
      <span class="text-2xl mr-2">🔗</span>
      UTM链接生成器
    </h2>
    <button id="utmGeneratorToggle" class="text-gray-500 hover:text-gray-700">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="width" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>
  </div>
  
  <div id="utmGeneratorContent" class="space-y-4">
    <!-- 网站域名 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">网站域名</label>
      <input
        type="url"
        id="websiteUrl"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        placeholder="https://example.com"
      />
      <p class="text-xs text-gray-500 mt-1">请输入您的网站域名（包含 https://）</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 流量类型 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">流量类型</label>
        <select
          id="utmMedium"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          onchange="updateUtmLink()"
        >
          <option value="cpc">💰 广告流量 (CPC/PPC)</option>
          <option value="feed">📰 信息流广告</option>
          <option value="brand">🏷️ 品牌专区</option>
          <option value="organic">🔍 自然搜索</option>
          <option value="social">👥 社交媒体</option>
          <option value="email">📧 邮件营销</option>
          <option value="affiliate">🤝 联盟推广</option>
        </select>
      </div>
      
      <!-- 来源平台 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">来源平台</label>
        <select
          id="utmSource"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          onchange="updateUtmLink()"
        >
          <optgroup label="搜索引擎">
            <option value="baidu">百度</option>
            <option value="google">Google</option>
            <option value="bing">必应</option>
            <option value="sogou">搜狗</option>
            <option value="so">360搜索</option>
          </optgroup>
          <optgroup label="社交媒体">
            <option value="wechat">微信</option>
            <option value="weibo">微博</option>
            <option value="douyin">抖音</option>
            <option value="kuaishou">快手</option>
            <option value="xiaohongshu">小红书</option>
          </optgroup>
          <optgroup label="其他平台">
            <option value="zhihu">知乎</option>
            <option value="bilibili">B站</option>
            <option value="toutiao">今日头条</option>
          </optgroup>
        </select>
      </div>
    </div>
    
    <!-- 活动名称 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">活动名称 *</label>
      <input
        type="text"
        id="utmCampaign"
        class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        placeholder="spring_2026"
        oninput="updateUtmLink()"
      />
      <p class="text-xs text-gray-500 mt-1">建议使用英文和下划线，例如：spring_2026, new_year_sale</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- 关键词 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">关键词 (可选)</label>
        <input
          type="text"
          id="utmTerm"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="AI阅卷"
          oninput="updateUtmLink()"
        />
        <p class="text-xs text-gray-500 mt-1">用于搜索广告，百度支持 {keyword}</p>
      </div>
      
      <!-- 广告内容 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">广告内容 (可选)</label>
        <input
          type="text"
          id="utmContent"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          placeholder="banner_01"
          oninput="updateUtmLink()"
        />
        <p class="text-xs text-gray-500 mt-1">用于区分不同的广告素材</p>
      </div>
    </div>
    
    <!-- 生成的链接 -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">生成的链接</label>
      <div class="relative">
        <textarea
          id="generatedUtmLink"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
          rows="3"
          readonly
          placeholder="请填写上方信息后自动生成链接..."
        ></textarea>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="flex flex-wrap gap-3">
      <button
        onclick="copyUtmLink()"
        class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        复制链接
      </button>
      
      <button
        onclick="testUtmLink()"
        class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
        </svg>
        在新窗口打开测试
      </button>
      
      <button
        onclick="saveWebsiteUrl()"
        class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        保存域名配置
      </button>
    </div>
    
    <!-- 复制成功提示 -->
    <div id="copySuccessMessage" class="hidden bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
      ✅ 链接已复制到剪贴板！
    </div>
  </div>
</div>
```

---

## 2. JavaScript代码

在 `<script>` 标签中添加以下代码：

```javascript
// ==================== UTM链接生成器 ====================

// 切换UTM生成器显示/隐藏
function toggleUtmGenerator() {
  const content = document.getElementById('utmGeneratorContent');
  const toggle = document.getElementById('utmGeneratorToggle');
  
  if (content.classList.contains('hidden')) {
    content.classList.remove('hidden');
    toggle.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
  } else {
    content.classList.add('hidden');
    toggle.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>';
  }
}

// 加载网站域名配置
async function loadWebsiteUrl() {
  try {
    const response = await fetch('/api/admin/config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.config.brandConfig && data.config.brandConfig.websiteUrl) {
      document.getElementById('websiteUrl').value = data.config.brandConfig.websiteUrl;
      updateUtmLink();
    }
  } catch (error) {
    console.error('Error loading website URL:', error);
  }
}

// 保存网站域名配置
async function saveWebsiteUrl() {
  const websiteUrl = document.getElementById('websiteUrl').value.trim();
  
  if (!websiteUrl) {
    alert('请输入网站域名');
    return;
  }
  
  // 验证URL格式
  try {
    new URL(websiteUrl);
  } catch (e) {
    alert('请输入有效的URL（包含 https://）');
    return;
  }
  
  try {
    const response = await fetch('/api/admin/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({
        brandConfig: {
          websiteUrl: websiteUrl
        }
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('域名配置已保存！');
      updateUtmLink();
    } else {
      alert(data.message || '保存失败');
    }
  } catch (error) {
    console.error('Error saving website URL:', error);
    alert('保存失败，请稍后重试');
  }
}

// 更新UTM链接
function updateUtmLink() {
  const websiteUrl = document.getElementById('websiteUrl').value.trim();
  const utmSource = document.getElementById('utmSource').value;
  const utmMedium = document.getElementById('utmMedium').value;
  const utmCampaign = document.getElementById('utmCampaign').value.trim();
  const utmTerm = document.getElementById('utmTerm').value.trim();
  const utmContent = document.getElementById('utmContent').value.trim();
  
  // 验证必填字段
  if (!websiteUrl || !utmCampaign) {
    document.getElementById('generatedUtmLink').value = '';
    return;
  }
  
  // 构建UTM参数
  const params = new URLSearchParams();
  params.append('utm_source', utmSource);
  params.append('utm_medium', utmMedium);
  params.append('utm_campaign', utmCampaign);
  
  if (utmTerm) {
    params.append('utm_term', utmTerm);
  }
  
  if (utmContent) {
    params.append('utm_content', utmContent);
  }
  
  // 生成完整链接
  const separator = websiteUrl.includes('?') ? '&' : '?';
  const fullLink = `${websiteUrl}${separator}${params.toString()}`;
  
  document.getElementById('generatedUtmLink').value = fullLink;
}

// 复制UTM链接
function copyUtmLink() {
  const linkTextarea = document.getElementById('generatedUtmLink');
  const link = linkTextarea.value;
  
  if (!link) {
    alert('请先生成链接');
    return;
  }
  
  // 复制到剪贴板
  navigator.clipboard.writeText(link).then(() => {
    // 显示成功提示
    const message = document.getElementById('copySuccessMessage');
    message.classList.remove('hidden');
    
    // 2秒后隐藏提示
    setTimeout(() => {
      message.classList.add('hidden');
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
    
    // 降级方案：使用旧方法
    linkTextarea.select();
    document.execCommand('copy');
    
    const message = document.getElementById('copySuccessMessage');
    message.classList.remove('hidden');
    setTimeout(() => {
      message.classList.add('hidden');
    }, 2000);
  });
}

// 在新窗口打开测试
function testUtmLink() {
  const link = document.getElementById('generatedUtmLink').value;
  
  if (!link) {
    alert('请先生成链接');
    return;
  }
  
  window.open(link, '_blank');
}

// 页面加载时初始化
loadWebsiteUrl();

// 设置默认活动名称（当前年月）
const now = new Date();
const defaultCampaign = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;
document.getElementById('utmCampaign').value = defaultCampaign;
updateUtmLink();
```

---

## 3. 添加位置说明

在 `frontend/admin.html` 中找到以下代码：

```html
<!-- 留言管理 Tab -->
<div id="messagesTab" class="hidden">
  <h2 class="text-2xl font-semibold mb-6">留言列表</h2>
  
  <!-- 在这里添加UTM链接生成器的HTML代码 -->
  
  <div id="messagesList">
    <!-- 留言列表 -->
  </div>
</div>
```

---

## 4. 测试清单

- [ ] 页面加载时自动加载网站域名配置
- [ ] 输入网站域名
- [ ] 选择不同的流量类型
- [ ] 选择不同的来源平台
- [ ] 输入活动名称
- [ ] 输入可选字段（关键词、广告内容）
- [ ] 验证链接是否实时更新
- [ ] 点击"复制链接"
- [ ] 验证是否显示"已复制"提示
- [ ] 点击"在新窗口打开测试"
- [ ] 验证是否打开新窗口
- [ ] 点击"保存域名配置"
- [ ] 刷新页面，验证域名是否保存
- [ ] 通过生成的链接提交留言
- [ ] 在留言管理中查看来源是否正确显示

---

## 5. 注意事项

1. **网站域名格式**：必须包含协议（https://）
2. **活动名称建议使用英文**：避免URL编码问题
3. **百度动态参数**：关键词可以使用 `{keyword}`，百度会自动替换
4. **保存配置**：点击"保存域名配置"后，域名会保存到配置文件中
5. **实时更新**：输入时链接会实时更新，无需点击"生成"按钮

---

完成以上代码添加后，用户就可以在管理后台轻松生成UTM链接了！

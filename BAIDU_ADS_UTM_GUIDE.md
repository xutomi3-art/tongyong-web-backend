# 百度广告UTM配置指南

本文档详细说明如何在投放百度广告时正确配置URL，确保系统能够准确追踪广告流量。

---

## 🎯 核心目标

通过在广告链接中添加UTM参数，让系统能够：

1. ✅ **识别广告流量**：区分广告和自然搜索
2. ✅ **追踪广告来源**：知道用户来自哪个广告平台（百度、Google等）
3. ✅ **评估广告效果**：分析不同广告活动、关键词的转化率

---

## 📖 UTM参数说明

UTM（Urchin Tracking Module）是一组简单的URL参数，用于追踪流量来源。

| 参数 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `utm_source` | ✅ | 流量来源 | baidu, google, bing |
| `utm_medium` | ✅ | 媒介类型 | **cpc**(点击付费广告), organic(自然搜索) |
| `utm_campaign` | 推荐 | 活动名称 | spring_2026, new_year_sale |
| `utm_term` | 可选 | 关键词 | AI阅卷, 智能批改 |
| `utm_content` | 可选 | 广告内容 | banner_01, text_ad_02 |

### 关键参数：utm_medium

系统通过 `utm_medium` 参数来识别流量类型。

**广告流量** 💰（utm_medium包含以下任一值）：
- `cpc` - 点击付费广告（Cost Per Click）
- `ppc` - 按点击付费（Pay Per Click）
- `paid` - 付费广告
- `ad` - 广告
- `ads` - 广告

**自然搜索流量** 🔍：
- `organic` - 自然搜索
- 或者Referer包含搜索引擎域名但没有UTM参数

---

## 🚀 百度广告投放配置

### 正确的广告链接格式

**基础URL**：
```
https://your-domain.com
```

**添加UTM参数后**：
```
https://your-domain.com?utm_source=baidu&utm_medium=cpc&utm_campaign=spring_2026&utm_term=AI阅卷&utm_content=banner_01
```

### 1. 百度搜索推广

在百度推广后台设置URL时：

**推广计划**：春季AI阅卷推广  
**推广单元**：AI阅卷关键词  
**访问URL**：
```
https://your-domain.com?utm_source=baidu&utm_medium=cpc&utm_campaign=spring_ai_grading&utm_term={keyword}&utm_content=search_ad
```

**注意**：百度支持动态参数 `{keyword}`，会自动替换为用户搜索的关键词！

### 2. 百度信息流广告

**访问URL**：
```
https://your-domain.com?utm_source=baidu&utm_medium=feed&utm_campaign=spring_feed&utm_content=image_01
```

### 3. 百度品牌专区

**访问URL**：
```
https://your-domain.com?utm_source=baidu&utm_medium=brand&utm_campaign=brand_zone&utm_content=logo
```

### 不同广告位的UTM配置示例

```
# 搜索广告 - 文字链
https://your-domain.com?utm_source=baidu&utm_medium=cpc&utm_campaign=spring_2026&utm_term=AI阅卷&utm_content=text_ad_01

# 搜索广告 - 图文混排
https://your-domain.com?utm_source=baidu&utm_medium=cpc&utm_campaign=spring_2026&utm_term=智能批改&utm_content=image_text_ad

# 信息流广告 - 单图
https://your-domain.com?utm_source=baidu&utm_medium=feed&utm_campaign=spring_2026&utm_content=single_image

# 信息流广告 - 三图
https://your-domain.com?utm_source=baidu&utm_medium=feed&utm_campaign=spring_2026&utm_content=three_images

# 品牌专区
https://your-domain.com?utm_source=baidu&utm_medium=brand&utm_campaign=spring_2026&utm_content=brand_zone
```

---

## 📊 系统显示效果

配置正确后，在留言管理中会显示：

| 来源 | 显示 |
|------|------|
| utm_medium=cpc | 💰 百度广告 |
| utm_medium=feed | 💰 百度信息流 |
| utm_medium=brand | 💰 百度品牌 |
| utm_medium=organic | 🔍 百度自然搜索 |
| 无UTM，Referer=baidu.com | 🔍 百度自然搜索 |

---

## 🛠️ UTM链接生成工具

您可以使用以下工具快速生成带UTM参数的URL：

- **Google Campaign URL Builder**：[https://ga-dev-tools.google/campaign-url-builder/](https://ga-dev-tools.google/campaign-url-builder/)
- **Facebook Ads URL Builder**：[https://www.facebook.com/business/google-analytics/build-your-url](https://www.facebook.com/business/google-analytics/build-your-url)

---

## 📝 AI操作指南

当用户询问如何追踪百度广告时，AI应该：

1. ✅ **提供本文档**：让用户了解UTM参数的重要性
2. ✅ **提供UTM配置示例**：根据用户的广告类型提供示例链接
3. ✅ **强调 `utm_medium=cpc`**：这是识别广告流量的关键
4. ✅ **指导用户在百度推广后台配置URL**
5. ✅ **提醒用户测试**：投放前先用示例链接测试，确保系统能正确识别

---

## 🧪 测试步骤

1. **生成测试链接**：
   ```
   https://your-domain.com?utm_source=baidu&utm_medium=cpc&utm_campaign=test_campaign
   ```

2. **访问测试链接**：在浏览器中打开该链接

3. **提交留言**：在网站上提交一条测试留言

4. **验证后台显示**：
   - 登录管理后台
   - 进入"留言管理"
   - 查看最新留言的来源是否显示为"💰 百度广告"
   - 查看活动名称是否为"test_campaign"

---

## ✅ 总结

通过正确配置UTM参数，您可以精确追踪每个广告活动的效果，优化投放策略，提高ROI。

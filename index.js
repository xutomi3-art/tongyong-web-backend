const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const { generateCaptchaText, generateCaptchaSVG } = require('./captcha');
const { renewCertificate, getCertificateInfo } = require('./cert-manager');
const { generateArticle: generateArticleNew, generateArticles, testLLMConfig } = require('./article-generator');
const { sendToFeishuBot, syncToFeishuTable } = require('./feishu-integration');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

// 验证码存储（使用内存，实际生产环境应使用Redis）
const captchaStore = new Map();

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 托管前端管理界面
app.use('/admin', express.static(path.join(__dirname, 'frontend')));

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // 初始化配置文件
    try {
      await fs.access(CONFIG_FILE);
    } catch {
      await fs.writeFile(CONFIG_FILE, JSON.stringify({
        brandName: '您的品牌名称',
        brandDescription: '您的产品描述',
        adminTitle: '管理后台',
        email: '',
        autoPostEnabled: false,
        postsPerDay: 5,
        autoPostTime: '09:00',
        autoPostCount: 1,
        autoPostInterval: 24,
        enableSearchRewrite: false,
        rewriteRounds: 3,
        seoKeywords: 'AI阅卷,智能阅卷,自动阅卷,在线阅卷系统,AI批改作业,智能批改,教育AI,智能教育,阅卷系统,考试阅卷,作业批改系统,教学评估,智能评分,OCR识别,手写识别,教育数字化',
        adminUsername: 'admin',
        adminPassword: 'admin123',
        // LLM配置
        llmApiKey: 'ca3264ed-7342-4b88-b966-a725b293c18e',
        llmApiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
        llmModel: 'doubao-seed-1-8-251228',
        // 图片配置
        imageUseAI: false,
        imageApiKey: '',
        unsplashApiKey: '',
        // SMTP配置
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpFrom: '',
        // 飞书配置
        feishuWebhook: '',
        feishuTableUrl: 'https://vcn27jg8tmuq.feishu.cn/base/FniubotRna9gyvs5oDMcbJgPnnb?table=tblQCOffzrWGhHnP&view=vewiicVZHC',
        feishuAppId: '',
        feishuAppSecret: ''
      }, null, 2));
    }
    
    // 初始化文章文件
    try {
      await fs.access(ARTICLES_FILE);
    } catch {
      await fs.writeFile(ARTICLES_FILE, JSON.stringify([], null, 2));
    }
    
    // 初始化联系人文件
    try {
      await fs.access(CONTACTS_FILE);
    } catch {
      await fs.writeFile(CONTACTS_FILE, JSON.stringify([], null, 2));
    }
  } catch (error) {
    console.error('Error ensuring data directory:', error);
  }
}

// 读取配置
async function getConfig() {
  const defaultConfig = {
    brandName: '您的品牌名称',
    brandDescription: '您的产品描述',
    adminTitle: '管理后台',
    email: '',
    autoPostEnabled: false,
    postsPerDay: 5,
    autoPostTime: '09:00',
    autoPostCount: 1,
    autoPostInterval: 24,
    enableSearchRewrite: false,
    rewriteRounds: 3,
    seoKeywords: 'AI阅卷,智能阅卷,自动阅卷,在线阅卷系统,AI批改作业,智能批改,教育AI,智能教育,阅卷系统,考试阅卷,作业批改系统,教学评估,智能评分,OCR识别,手写识别,教育数字化',
    adminUsername: 'admin',
    adminPassword: 'admin123',
    llmApiKey: 'ca3264ed-7342-4b88-b966-a725b293c18e',
    llmApiEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    llmModel: 'doubao-seed-1-8-251228',
    imageUseAI: false,
    imageApiKey: '',
    unsplashApiKey: '',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    feishuWebhook: '',
    feishuTableUrl: 'https://vcn27jg8tmuq.feishu.cn/base/FniubotRna9gyvs5oDMcbJgPnnb?table=tblQCOffzrWGhHnP&view=vewiicVZHC',
    feishuAppId: '',
    feishuAppSecret: ''
  };
  
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    const savedConfig = JSON.parse(data);
    // 合并默认配置和已保存配置，确保所有字段都存在
    return { ...defaultConfig, ...savedConfig };
  } catch (error) {
    return defaultConfig;
  }
}

// 保存配置
async function saveConfig(config) {
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// 读取文章
async function getArticles() {
  try {
    const data = await fs.readFile(ARTICLES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 保存文章
async function saveArticles(articles) {
  await fs.writeFile(ARTICLES_FILE, JSON.stringify(articles, null, 2));
}

// 读取联系人
async function getContacts() {
  try {
    const data = await fs.readFile(CONTACTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// 保存联系人
async function saveContacts(contacts) {
  await fs.writeFile(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

// 生成SEO文章（使用OpenAI// 生成文章函数（使用新模块）
async function generateArticle() {
  const config = await getConfig();
  
  const llmConfig = config.llmApiKey && config.llmApiEndpoint ? {
    apiKey: config.llmApiKey,
    apiEndpoint: config.llmApiEndpoint,
    model: config.llmModel
  } : null;
  
  const imageConfig = {
    useAI: config.imageUseAI,
    apiKey: config.imageApiKey,
    unsplashApiKey: config.unsplashApiKey
  };
  
  return await generateArticleNew(llmConfig, imageConfig);
}



// 发送邮件
async function sendEmail(to, subject, html) {
  try {
    const config = await getConfig();
    
    // 优先使用配置的SMTP，否则使用环境变量
    const port = config.smtpPort || parseInt(process.env.SMTP_PORT || '587');
    const smtpConfig = {
      host: config.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465, // 465端口使用SSL，其他端口使用STARTTLS
      auth: {
        user: config.smtpUser || process.env.EMAIL_USER,
        pass: config.smtpPassword || process.env.EMAIL_PASS,
      },
    };
    
    // 如果没有配置SMTP，跳过发送
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.log('SMTP未配置，跳过邮件发送');
      return false;
    }
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    await transporter.sendMail({
      from: config.smtpFrom || smtpConfig.auth.user,
      to,
      subject,
      html,
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// API路由

// 生成验证码
app.get('/api/captcha', (req, res) => {
  const captchaId = Date.now().toString() + Math.random().toString(36).substring(7);
  const captchaText = generateCaptchaText();
  
  // 存储验证码，5分钟后过期
  captchaStore.set(captchaId, {
    text: captchaText.toLowerCase(),
    expires: Date.now() + 5 * 60 * 1000
  });
  
  // 清理过期验证码
  for (const [key, value] of captchaStore.entries()) {
    if (value.expires < Date.now()) {
      captchaStore.delete(key);
    }
  }
  
  const svg = generateCaptchaSVG(captchaText);
  
  res.json({
    captchaId,
    svg: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  });
});

// 验证验证码
app.post('/api/verify-captcha', (req, res) => {
  const { captchaId, captchaText } = req.body;
  
  const stored = captchaStore.get(captchaId);
  
  if (!stored) {
    return res.json({ valid: false, message: '验证码已过期' });
  }
  
  if (stored.expires < Date.now()) {
    captchaStore.delete(captchaId);
    return res.json({ valid: false, message: '验证码已过期' });
  }
  
  if (captchaText.toLowerCase() !== stored.text) {
    return res.json({ valid: false, message: '验证码错误' });
  }
  
  // 验证成功后删除
  captchaStore.delete(captchaId);
  
  res.json({ valid: true });
});

// 管理员登录
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const config = await getConfig();
  
  // 支持新的admins数组格式
  const admins = config.admins || [];
  const admin = admins.find(a => a.email === email);
  
  if (admin && admin.password === password) {
    res.json({ 
      success: true, 
      token: Buffer.from(`${email}:${password}`).toString('base64'),
      needsPasswordChange: admin.needsPasswordChange || false,
      email: admin.email,
      name: admin.name
    });
  } else {
    res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
});

// 验证token
app.get('/api/admin/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [email, password] = decoded.split(':');
    const config = await getConfig();
    
    const admins = config.admins || [];
    const admin = admins.find(a => a.email === email && a.password === password);
    
    if (admin) {
      res.json({ 
        valid: true,
        needsPasswordChange: admin.needsPasswordChange || false,
        email: admin.email,
        name: admin.name
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    res.json({ valid: false });
  }
});

// 获取配置
app.get('/api/admin/config', async (req, res) => {
  const config = await getConfig();
  // 返回完整配置，但隐藏敏感信息（密码部分隐藏）
  res.json({
    email: config.email,
    autoPostEnabled: config.autoPostEnabled,
    postsPerDay: config.postsPerDay,
    autoPostTime: config.autoPostTime,
    aiArticleCount: config.aiArticleCount,
    rewriteArticleCount: config.rewriteArticleCount,
    autoPostInterval: config.autoPostInterval,
    enableSearchRewrite: config.enableSearchRewrite,
    rewriteRounds: config.rewriteRounds,
    seoKeywords: config.seoKeywords,
    llmApiKey: config.llmApiKey,
    llmApiEndpoint: config.llmApiEndpoint,
    llmModel: config.llmModel,
    imageUseAI: config.imageUseAI,
    imageApiKey: config.imageApiKey,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpUser: config.smtpUser,
    smtpPassword: config.smtpPassword, // 在生产环境中可以考虑隐藏
    smtpFrom: config.smtpFrom,
    feishuWebhook: config.feishuWebhook,
    feishuTableUrl: config.feishuTableUrl,
    feishuAppId: config.feishuAppId,
    feishuAppSecret: config.feishuAppSecret // 在生产环境中可以考虑隐藏
  });
});

// 保存配置
app.post('/api/admin/config', async (req, res) => {
  const config = await getConfig();
  
  // 更新所有配置字段
  Object.keys(req.body).forEach(key => {
    if (key !== 'adminPassword') { // 密码单独处理
      config[key] = req.body[key];
    }
  });
  
  await saveConfig(config);
  res.json({ success: true });
});

// 修改密码
app.post('/api/admin/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  const config = await getConfig();
  
  const admins = config.admins || [];
  const adminIndex = admins.findIndex(a => a.email === email);
  
  if (adminIndex === -1) {
    return res.status(404).json({ success: false, message: '管理员不存在' });
  }
  
  if (admins[adminIndex].password !== oldPassword) {
    return res.status(401).json({ success: false, message: '旧密码错误' });
  }
  
  admins[adminIndex].password = newPassword;
  admins[adminIndex].needsPasswordChange = false;
  config.admins = admins;
  
  await saveConfig(config);
  res.json({ success: true, message: '密码修改成功' });
});

// 测试LLM API配置
app.post('/api/admin/test-llm', async (req, res) => {
  const { apiKey, apiEndpoint, model } = req.body;
  const result = await testLLMConfig({ apiKey, apiEndpoint, model });
  res.json(result);
});

// 获取文章列表
app.get('/api/admin/articles', async (req, res) => {
  const articles = await getArticles();
  res.json(articles);
});

// 获取留言列表
app.get('/api/admin/contacts', async (req, res) => {
  const contacts = await getContacts();
  res.json(contacts);
});

// 生成文章
app.post('/api/admin/generate-article', async (req, res) => {
  try {
    const config = await getConfig();
    
    // 准备LLM配置
    const llmConfig = config.llmApiKey && config.llmApiEndpoint ? {
      apiKey: config.llmApiKey,
      apiEndpoint: config.llmApiEndpoint,
      model: config.llmModel
    } : null;
    
    // 准备图片配置
    const imageConfig = {
      useAI: config.imageUseAI,
      apiKey: config.imageApiKey,
      unsplashApiKey: config.unsplashApiKey
    };
    
    console.log('[DEBUG] config.unsplashApiKey:', config.unsplashApiKey);
    console.log('[DEBUG] imageConfig:', imageConfig);
    
    const article = await generateArticle(llmConfig, imageConfig);
    const articles = await getArticles();
    articles.unshift(article);
    await saveArticles(articles);
    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除文章
app.delete('/api/admin/articles/:id', async (req, res) => {
  const { id } = req.params;
  let articles = await getArticles();
  articles = articles.filter(a => a.id !== id);
  await saveArticles(articles);
  res.json({ success: true });
});

// 获取公开文章列表（用于前端展示）
app.get('/api/articles', async (req, res) => {
  const articles = await getArticles();
  const published = articles.filter(a => a.published);
  res.json(published);
});

// 提交联系表单
app.post('/api/contact', async (req, res) => {
  try {
    const { captchaId, captchaText, ...contactData } = req.body;
    
    // 验证验证码（强制要求）
    if (!captchaId || !captchaText) {
      return res.status(400).json({ success: false, error: '请输入验证码' });
    }
    
    const stored = captchaStore.get(captchaId);
    if (!stored || stored.expires < Date.now()) {
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }
    if (stored.text !== captchaText.toLowerCase()) {
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }
    // 验证成功后删除验证码
    captchaStore.delete(captchaId);
    
    const config = await getConfig();
    
    // 构造来源信息（支持UTM参数）
    let sourceInfo = '直接访问';
    let trafficType = 'direct'; // direct, organic, paid
    let utmData = {};
    
    if (contactData.trafficSource) {
      const ts = contactData.trafficSource;
      utmData = {
        utm_source: ts.utm_source || ts.source || '',
        utm_medium: ts.utm_medium || ts.medium || '',
        utm_campaign: ts.utm_campaign || ts.campaign || '',
        utm_term: ts.utm_term || ts.keyword || '',
        utm_content: ts.utm_content || ''
      };
      
      // 判断流量类型
      const source = utmData.utm_source.toLowerCase();
      const medium = utmData.utm_medium.toLowerCase();
      
      if (medium.includes('cpc') || medium.includes('ppc') || medium.includes('paid') || medium.includes('ad')) {
        trafficType = 'paid';
        sourceInfo = `💰 ${utmData.utm_source || '未知'} 广告`;
      } else if (source.includes('baidu') || source.includes('google') || source.includes('bing')) {
        trafficType = 'organic';
        sourceInfo = `🔍 ${utmData.utm_source} 自然搜索`;
      } else if (source) {
        trafficType = 'referral';
        sourceInfo = `🔗 ${utmData.utm_source}`;
      }
      
      // 添加详细信息
      if (utmData.utm_campaign) {
        sourceInfo += ` / ${utmData.utm_campaign}`;
      }
      if (utmData.utm_term) {
        sourceInfo += ` / ${utmData.utm_term}`;
      }
    }
    
    // 保存到文件
    const contacts = await getContacts();
    contacts.unshift({
      ...contactData,
      source: sourceInfo,
      trafficType: trafficType,
      utmData: utmData,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString()
    });
    await saveContacts(contacts);
    
    // 发送邮件
    if (config.email) {
      const emailHtml = `
        <h2>新的联系表单提交</h2>
        <p><strong>姓名：</strong>${contactData.name}</p>
        <p><strong>学校/机构：</strong>${contactData.school || contactData.company || '-'}</p>
        <p><strong>邮箱：</strong>${contactData.email}</p>
        <p><strong>电话：</strong>${contactData.phone}</p>
        <p><strong>留言：</strong>${contactData.message || '无'}</p>
        <hr>
        <p><strong>访问来源：</strong>${sourceInfo}</p>
        <p><strong>提交时间：</strong>${new Date().toLocaleString('zh-CN')}</p>
      `;
      
      const emailSubject = `${config.brandConfig?.emailSubjectPrefix || '[' + (config.brandConfig?.name || '系统') + '] '}新的联系表单`;
      await sendEmail(config.email, emailSubject, emailHtml);
    }
    
    // 发送到飞书机器人
    if (config.feishuWebhook) {
      await sendToFeishuBot(config.feishuWebhook, {
        ...contactData,
        school: contactData.school || contactData.company || '-',
        source: sourceInfo
      });
    }
    
    // 同步到飞书表格
    if (config.feishuAppId && config.feishuAppSecret && config.feishuTableUrl) {
      await syncToFeishuTable(config, {
        ...contactData,
        school: contactData.school || contactData.company || '-',
        source: sourceInfo
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error processing contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 来源统计
app.post('/api/analytics', async (req, res) => {
  // 这里可以保存统计数据到数据库或文件
  console.log('Analytics:', req.body);
  res.json({ success: true });
});

// 定时任务：每天自动生成文章
async function scheduleArticleGeneration() {
  const config = await getConfig();
  
  if (!config.autoPostEnabled) {
    return;
  }
  
  console.log('\n========== 开始自动发布文章 ==========');
  console.log(`搜索改写: ${config.enableSearchRewrite ? '启用' : '禁用'}`);
  
  try {
    const llmConfig = config.llmApiKey && config.llmApiEndpoint ? {
      apiKey: config.llmApiKey,
      apiEndpoint: config.llmApiEndpoint,
      model: config.llmModel
    } : null;
    
    const imageConfig = {
      useAI: config.imageUseAI,
      apiKey: config.imageApiKey,
      unsplashApiKey: config.unsplashApiKey
    };
    
    // 使用新的批量生成功能
    const newArticles = await generateArticles({
      llmConfig,
      imageConfig,
      enableSearchRewrite: config.enableSearchRewrite,
      rewriteRounds: config.rewriteRounds || 3,
      aiArticleCount: config.aiArticleCount || 1,
      rewriteArticleCount: config.rewriteArticleCount || 0
    });
    
    // 保存所有文章
    const articles = await getArticles();
    for (const article of newArticles) {
      articles.unshift(article);
      console.log(`✓ 文章已保存: ${article.title} [类型: ${article.type}]`);
    }
    await saveArticles(articles);
    
    console.log(`========== 自动发布完成，共 ${newArticles.length} 篇 ==========\n`);
  } catch (error) {
    console.error('Error in scheduled article generation:', error);
  }
}

// 每天凌晨2点执行
cron.schedule('0 2 * * *', scheduleArticleGeneration);

// SSL证书管理API
app.post('/api/admin/renew-certificate', async (req, res) => {
  try {
    const result = await renewCertificate();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/certificate-info', async (req, res) => {
  try {
    const result = await getCertificateInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试邮件发送API
app.post('/api/admin/test-email', async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({ success: false, message: '请输入测试邮箱地址' });
    }
    
    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({ success: false, message: '邮箱格式不正确' });
    }
    
    const config = await getConfig();
    
    // 检查SMTP是否配置
    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'SMTP未配置，请先配置SMTP信息' 
      });
    }
    
    // 发送测试邮件
    const testEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📧 SMTP测试邮件</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <div style="background: white; padding: 25px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">✅ 邮件发送成功！</h2>
            
            <p style="color: #666; line-height: 1.6;">
              恭喜！您的SMTP配置正确，邮件系统运行正常。
            </p>
            
            <div style="background: #f0f7ff; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #555;">
                <strong>测试时间：</strong>${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
              </p>
              <p style="margin: 10px 0 0 0; color: #555;">
                <strong>发送自：</strong>闪阅 AI 全科阅卷系统
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              现在您可以正常接收联系表单提交的通知邮件了。
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              © 2026 闪阅 - AI全科阅卷系统 | 智能教育，从此开始
            </p>
          </div>
        </div>
      </div>
    `;
    
    const success = await sendEmail(
      testEmail,
      '【闪阅】SMTP测试邮件 - 配置成功',
      testEmailHtml
    );
    
    if (success) {
      res.json({ 
        success: true, 
        message: `测试邮件已发送到 ${testEmail}，请检查收件箱` 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '邮件发送失败，请检查SMTP配置是否正确' 
      });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      message: `发送失败: ${error.message}` 
    });
  }
});

// 测试飞书机器人
app.post('/api/admin/test-feishu-bot', async (req, res) => {
  try {
    const config = await getConfig();
    
    if (!config.feishuWebhook) {
      return res.status(400).json({ 
        success: false, 
        message: '飞书机器人Webhook未配置，请先配置Webhook地址' 
      });
    }
    
    // 发送测试消息
    const testMessage = {
      name: '测试用户',
      school: '闪阅管理后台',
      email: 'test@example.com',
      phone: '13800138000',
      message: '这是一条测试消息，用于验证飞书机器人配置是否正确。',
      source: '管理后台测试'
    };
    
    const success = await sendToFeishuBot(config.feishuWebhook, testMessage);
    
    if (success) {
      res.json({ 
        success: true, 
        message: '测试消息已发送到飞书群，请检查飞书群消息' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '发送失败，请检查Webhook地址是否正确' 
      });
    }
  } catch (error) {
    console.error('Test Feishu bot error:', error);
    res.status(500).json({ 
      success: false, 
      message: `发送失败: ${error.message}` 
    });
  }
});

// 测试飞书表格同步
app.post('/api/admin/test-feishu-table', async (req, res) => {
  try {
    const config = await getConfig();
    
    if (!config.feishuAppId || !config.feishuAppSecret || !config.feishuTableUrl) {
      return res.status(400).json({ 
        success: false, 
        message: '飞书表格配置不完整，请配置App ID、App Secret和表格URL' 
      });
    }
    
    // 写入测试数据
    const testData = {
      name: '测试用户',
      school: '闪阅管理后台',
      email: 'test@example.com',
      phone: '13800138000',
      message: '这是一条测试数据，用于验证飞书表格同步是否正常。',
      source: '管理后台测试',
      timestamp: new Date().toISOString()
    };
    
    const success = await syncToFeishuTable(
      config.feishuAppId,
      config.feishuAppSecret,
      config.feishuTableUrl,
      testData
    );
    
    if (success) {
      res.json({ 
        success: true, 
        message: '测试数据已写入飞书表格，请检查表格内容' 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: '写入失败，请检查App ID、App Secret和表格URL是否正确' 
      });
    }
  } catch (error) {
    console.error('Test Feishu table error:', error);
    res.status(500).json({ 
      success: false, 
      message: `写入失败: ${error.message}` 
    });
  }
});

// URL去重管理API
const usedUrlsManager = require('./used-urls-manager');

// 获取已使用URL数量
app.get('/api/admin/used-urls/count', async (req, res) => {
  try {
    const count = await usedUrlsManager.getUsedUrlCount();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取所有已使用URL
app.get('/api/admin/used-urls', async (req, res) => {
  try {
    const urls = await usedUrlsManager.getUsedUrls();
    res.json({ success: true, urls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 清空已使用URL
app.post('/api/admin/used-urls/clear', async (req, res) => {
  try {
    await usedUrlsManager.clearUsedUrls();
    res.json({ success: true, message: '已成功清空历史URL' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试Unsplash API
app.post('/api/admin/test-unsplash', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: '请提供Unsplash Access Key' });
    }
    
    const { UnsplashFetcher } = require('./unsplash-fetcher-simple');
    const fetcher = new UnsplashFetcher(apiKey);
    
    // 测试搜索图片
    const axios = require('axios');
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: 'education',
        per_page: 10
      },
      headers: {
        'Authorization': `Client-ID ${apiKey}`
      },
      timeout: 10000
    });
    
    res.json({ 
      success: true, 
      message: 'Unsplash API连接成功',
      count: response.data.results.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.response?.data?.errors?.[0] || error.message 
    });
  }
});

// 获取Unsplash图片使用统计
app.get('/api/admin/unsplash-stats', async (req, res) => {
  try {
    const { UnsplashFetcher } = require('./unsplash-fetcher-simple');
    const count = await UnsplashFetcher.getUsedImageCount();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 清空 Unsplash 图片使用记录
app.post('/api/admin/clear-unsplash-images', async (req, res) => {
  try {
    const { UnsplashFetcher } = require('./unsplash-fetcher-simple');
    await UnsplashFetcher.clearUsedImages();
    res.json({ success: true, message: '已成功清空图片使用记录' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 启动服务器
async function start() {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();

// 忘记密码 - 发送一次性密码
app.post('/api/admin/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const config = await getConfig();
    
    const admins = config.admins || [];
    const admin = admins.find(a => a.email === email);
    
    if (!admin) {
      // 为了安全，不透露邮箱是否存在
      return res.json({ success: true, message: '如果该邮箱存在，我们已发送一次性密码到您的邮箱' });
    }
    
    // 生成6位数字一次性密码
    const oneTimePassword = Math.floor(100000 + Math.random() * 900000).toString();
    const expireTime = Date.now() + 15 * 60 * 1000; // 15分钟后过期
    
    // 保存一次性密码
    if (!global.oneTimePasswords) {
      global.oneTimePasswords = new Map();
    }
    global.oneTimePasswords.set(email, { password: oneTimePassword, expires: expireTime });
    
    // 发送邮件
    if (config.emailConfig && config.emailConfig.user) {
      const emailSubject = `${config.brandConfig?.emailSubjectPrefix || '[系统] '}一次性登录密码`;
      const emailHtml = `
        <h2>一次性登录密码</h2>
        <p>您好，${admin.name || '管理员'}！</p>
        <p>您的一次性登录密码是：<strong style="font-size: 24px; color: #4F46E5;">${oneTimePassword}</strong></p>
        <p>此密码将在 <strong>15分钟</strong> 后过期。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
        <hr>
        <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      `;
      
      await sendEmail(config.emailConfig.user, emailSubject, emailHtml);
    }
    
    res.json({ success: true, message: '如果该邮箱存在，我们已发送一次性密码到您的邮箱' });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ success: false, message: '发送失败，请稍后重试' });
  }
});

// 使用一次性密码登录
app.post('/api/admin/login-with-otp', async (req, res) => {
  try {
    const { email, oneTimePassword } = req.body;
    
    if (!global.oneTimePasswords || !global.oneTimePasswords.has(email)) {
      return res.status(401).json({ success: false, message: '一次性密码无效或已过期' });
    }
    
    const stored = global.oneTimePasswords.get(email);
    
    if (stored.expires < Date.now()) {
      global.oneTimePasswords.delete(email);
      return res.status(401).json({ success: false, message: '一次性密码已过期' });
    }
    
    if (stored.password !== oneTimePassword) {
      return res.status(401).json({ success: false, message: '一次性密码错误' });
    }
    
    // 验证成功，删除一次性密码
    global.oneTimePasswords.delete(email);
    
    const config = await getConfig();
    const admins = config.admins || [];
    const admin = admins.find(a => a.email === email);
    
    if (!admin) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }
    
    res.json({ 
      success: true, 
      token: Buffer.from(`${email}:${admin.password}`).toString('base64'),
      needsPasswordChange: true, // 使用一次性密码登录后必须修改密码
      email: admin.email,
      name: admin.name
    });
  } catch (error) {
    console.error('Error in login-with-otp:', error);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});


// 获取所有管理员列表
app.get('/api/admin/admins', async (req, res) => {
  try {
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 返回管理员列表，但不包含密码
    const adminList = admins.map(admin => ({
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt,
      needsPasswordChange: admin.needsPasswordChange
    }));
    
    res.json({ success: true, admins: adminList });
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({ success: false, message: '获取管理员列表失败' });
  }
});

// 添加管理员
app.post('/api/admin/admins', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ success: false, message: '邮箱、姓名和密码不能为空' });
    }
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 检查邮箱是否已存在
    if (admins.find(a => a.email === email)) {
      return res.status(400).json({ success: false, message: '该邮箱已被使用' });
    }
    
    // 添加新管理员
    admins.push({
      email,
      name,
      password,
      role: 'admin',
      createdAt: new Date().toISOString(),
      needsPasswordChange: false
    });
    
    config.admins = admins;
    await saveConfig(config);
    
    res.json({ success: true, message: '管理员添加成功' });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ success: false, message: '添加管理员失败' });
  }
});

// 更新管理员信息
app.put('/api/admin/admins/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { name, password } = req.body;
    
    const config = await getConfig();
    const admins = config.admins || [];
    const adminIndex = admins.findIndex(a => a.email === email);
    
    if (adminIndex === -1) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }
    
    // 更新管理员信息
    if (name) {
      admins[adminIndex].name = name;
    }
    if (password) {
      admins[adminIndex].password = password;
      admins[adminIndex].needsPasswordChange = false;
    }
    
    config.admins = admins;
    await saveConfig(config);
    
    res.json({ success: true, message: '管理员信息更新成功' });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: '更新管理员信息失败' });
  }
});

// 删除管理员
app.delete('/api/admin/admins/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 不能删除最后一个管理员
    if (admins.length <= 1) {
      return res.status(400).json({ success: false, message: '不能删除最后一个管理员' });
    }
    
    const adminIndex = admins.findIndex(a => a.email === email);
    
    if (adminIndex === -1) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }
    
    // 删除管理员
    admins.splice(adminIndex, 1);
    config.admins = admins;
    await saveConfig(config);
    
    res.json({ success: true, message: '管理员删除成功' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: '删除管理员失败' });
  }
});


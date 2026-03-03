const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cron = require('node-cron');
const { generateCaptchaText, generateCaptchaSVG } = require('./captcha');
const { renewCertificate, getCertificateInfo } = require('./cert-manager');
const { generateArticle: generateArticleNew, generateArticles, testLLMConfig } = require('./article-generator');
const { sendToFeishuBot, syncToFeishuTable } = require('./feishu-integration');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
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
// 静态文件服务 - 托管下载的图片
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

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
    useAI: config.imageConfig?.useAI ?? config.imageUseAI,
    apiKey: config.imageConfig?.aiApiKey ?? config.imageApiKey,
    unsplashApiKey: config.imageConfig?.unsplashApiKey ?? config.unsplashApiKey
  };
  
  const wordCount = config.seoConfig?.articleWordCount ?? config.articleWordCount ?? 1000;
  const seoKeywords = config.seoConfig?.keywords || config.seoKeywords || null;

  // 获取已有文章用于图片去重
  const fs = require('fs');
  const path = require('path');
  let existingArticles = [];
  try {
    const articlesFile = path.join(__dirname, 'data', 'articles.json');
    if (fs.existsSync(articlesFile)) {
      existingArticles = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
    }
  } catch (e) { /* ignore */ }
  const dedupConfig = {
    enableImageDeduplication: config.imageConfig?.enableDeduplication ?? config.enableDeduplication ?? false,
    deduplicationWindow: config.imageConfig?.deduplicationWindow ?? config.deduplicationWindow ?? 5
  };
  return await generateArticleNew(llmConfig, imageConfig, dedupConfig, wordCount, seoKeywords, existingArticles);
}



// 发送邮件
async function sendEmail(to, subject, html) {
  try {
    const config = await getConfig();
    
    // 优先使用配置的SMTP，否则使用环境变量
    const emailCfg = config.emailConfig || {};
    const port = emailCfg.port || parseInt(process.env.SMTP_PORT || '587');
    const smtpConfig = {
      host: emailCfg.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: port,
      secure: port === 465, // 465端口使用SSL，其他端口使用STARTTLS
      auth: {
        user: emailCfg.user || process.env.EMAIL_USER,
        pass: emailCfg.pass || process.env.EMAIL_PASS,
      },
    };
    
    // 如果没有配置SMTP，跳过发送
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.log('SMTP未配置，跳过邮件发送');
      return false;
    }
    
    const transporter = nodemailer.createTransport(smtpConfig);
    
    await transporter.sendMail({
      from: emailCfg.from || smtpConfig.auth.user,
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
  
  // 支持新的admins数组格式，兼容旧的adminUsername/adminPassword格式
  let admins = config.admins || [];
  if (admins.length === 0 && config.adminPassword) {
    // 兼容旧格式：用adminUsername或email字段匹配
    admins = [{ email: email, password: config.adminPassword, name: config.adminUsername || 'admin', role: 'admin' }];
  }
  const admin = admins.find(a => a.email === email);

  if (!admin) {
    return res.status(401).json({ success: false, message: '邮箱或密码错误' });
  }
  
  // 检查密码（支持明文和加密两种格式）
  let passwordMatch = false;
  if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$')) {
    // 已加密的密码
    passwordMatch = await bcrypt.compare(password, admin.password);
  } else {
    // 明文密码（兼容旧数据）
    passwordMatch = (admin.password === password);
  }
  
  if (passwordMatch) {
    // 生成JWT token
    const token = jwt.sign(
      { 
        email: admin.email, 
        name: admin.name,
        role: admin.role || 'admin'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      success: true, 
      token: token,
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
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ 
      valid: true,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    });
  } catch (error) {
    res.json({ valid: false });
  }
});

// Token验证中间件
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未提供认证token' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token无效或已过期' });
  }
}

// 获取配置
app.get('/api/admin/config', verifyToken, async (req, res) => {
  const config = await getConfig();
  // 返回扁平化的配置结构，方便前端使用
  res.json({
    // 品牌配置
    brandName: config.brandConfig?.name || '',
    brandDescription: config.brandConfig?.description || '',
    adminTitle: config.brandConfig?.adminTitle || '管理后台',
    emailSubjectPrefix: config.brandConfig?.emailSubjectPrefix || '',
    websiteUrl: config.brandConfig?.websiteUrl || '',
    
    // 邮件配置
    email: config.emailConfig?.adminEmail || '',
    smtpHost: config.emailConfig?.host || '',
    smtpPort: config.emailConfig?.port || 465,
    smtpUser: config.emailConfig?.user || '',
    smtpPassword: config.emailConfig?.pass || '',
    smtpFrom: config.emailConfig?.from || '',
    
    // 飞书配置（兼容根级别和嵌套结构）
    feishuWebhook: config.feishuConfig?.webhookUrl || config.feishuWebhook || '',
    feishuAppId: config.feishuConfig?.appId || config.feishuAppId || '',
    feishuAppSecret: config.feishuConfig?.appSecret || config.feishuAppSecret || '',
    feishuTableUrl: config.feishuConfig?.tableUrl || config.feishuTableUrl || '',
    
    // LLM配置
    llmApiKey: config.llmConfig?.apiKey || '',
    llmApiEndpoint: config.llmConfig?.baseURL || '',
    llmModel: config.llmConfig?.model || '',
    
    // 图片配置
    unsplashApiKey: config.imageConfig?.unsplashApiKey || '',
    imageUseAI: config.imageConfig?.useAI || false,
    imageApiKey: config.imageConfig?.aiApiKey || '',
    enableImageDeduplication: config.imageConfig?.enableDeduplication || false,
    deduplicationWindow: config.imageConfig?.deduplicationWindow || 5,
    
    // SEO配置
    autoPostEnabled: config.seoConfig?.autoPublish || false,
    autoPostTime: config.seoConfig?.publishTime || '09:00',
    autoPostInterval: config.seoConfig?.publishInterval || 24,
    postsPerDay: config.seoConfig?.postsPerDay || 5,
    aiArticleCount: config.seoConfig?.aiArticleCount || 1,
    rewriteArticleCount: config.seoConfig?.rewriteArticleCount || 0,
    enableSearchRewrite: config.seoConfig?.enableSearchRewrite || false,
    rewriteRounds: config.seoConfig?.rewriteRounds || 3,
    articleWordCount: config.seoConfig?.articleWordCount || 1000,
    seoKeywords: config.seoConfig?.keywords || '',
    tavilyConfig: config.tavilyConfig || {},
    tavilyApiKey: config.tavilyConfig?.apiKey || '',
    tavilyMaxResults: config.tavilyConfig?.maxResults || 5,
    rewritePrompt: config.seoConfig?.rewritePrompt || ''
  });
});

// 保存配置
app.post('/api/admin/config', verifyToken, async (req, res) => {
  const config = await getConfig();
  const data = req.body;
  
  // 更新品牌配置
  if (data.brandName !== undefined || data.brandDescription !== undefined || data.adminTitle !== undefined || data.emailSubjectPrefix !== undefined || data.websiteUrl !== undefined) {
    config.brandConfig = config.brandConfig || {};
    if (data.brandName !== undefined) config.brandConfig.name = data.brandName;
    if (data.brandDescription !== undefined) config.brandConfig.description = data.brandDescription;
    if (data.adminTitle !== undefined) config.brandConfig.adminTitle = data.adminTitle;
    if (data.emailSubjectPrefix !== undefined) config.brandConfig.emailSubjectPrefix = data.emailSubjectPrefix;
    if (data.websiteUrl !== undefined) config.brandConfig.websiteUrl = data.websiteUrl;
  }
  
  // 更新邮件配置
  if (data.email !== undefined || data.smtpHost !== undefined || data.smtpPort !== undefined || data.smtpUser !== undefined || data.smtpPassword !== undefined || data.smtpFrom !== undefined) {
    config.emailConfig = config.emailConfig || {};
    if (data.email !== undefined) {
      config.emailConfig.adminEmail = data.email;
      config.email = data.email;  // 同时保存到根级别，供邮件发送使用
    }
    if (data.smtpHost !== undefined) config.emailConfig.host = data.smtpHost;
    if (data.smtpPort !== undefined) config.emailConfig.port = data.smtpPort;
    if (data.smtpUser !== undefined) config.emailConfig.user = data.smtpUser;
    if (data.smtpPassword !== undefined) config.emailConfig.pass = data.smtpPassword;
    if (data.smtpFrom !== undefined) config.emailConfig.from = data.smtpFrom;
  }
  
  // 更新飞书配置
  if (data.feishuWebhook !== undefined) config.feishuWebhook = data.feishuWebhook;
  if (data.feishuAppId !== undefined) config.feishuAppId = data.feishuAppId;
  if (data.feishuAppSecret !== undefined) config.feishuAppSecret = data.feishuAppSecret;
  if (data.feishuTableUrl !== undefined) config.feishuTableUrl = data.feishuTableUrl;
  
  // 更新LLM配置
  if (data.llmApiKey !== undefined || data.llmApiEndpoint !== undefined || data.llmModel !== undefined) {
    config.llmConfig = config.llmConfig || {};
    if (data.llmApiKey !== undefined) config.llmConfig.apiKey = data.llmApiKey;
    if (data.llmApiEndpoint !== undefined) config.llmConfig.baseURL = data.llmApiEndpoint;
    if (data.llmModel !== undefined) config.llmConfig.model = data.llmModel;
  }
  
  // 更新图片配置
  if (data.unsplashApiKey !== undefined || data.imageUseAI !== undefined || data.imageApiKey !== undefined || data.enableImageDeduplication !== undefined || data.deduplicationWindow !== undefined) {
    config.imageConfig = config.imageConfig || {};
    if (data.unsplashApiKey !== undefined) config.imageConfig.unsplashApiKey = data.unsplashApiKey;
    if (data.imageUseAI !== undefined) config.imageConfig.useAI = data.imageUseAI;
    if (data.imageApiKey !== undefined) config.imageConfig.aiApiKey = data.imageApiKey;
    if (data.enableImageDeduplication !== undefined) config.imageConfig.enableDeduplication = data.enableImageDeduplication;
    if (data.deduplicationWindow !== undefined) config.imageConfig.deduplicationWindow = data.deduplicationWindow;
  }
  
  // 更新SEO配置
  if (data.autoPostEnabled !== undefined || data.autoPostTime !== undefined || data.autoPostInterval !== undefined || data.postsPerDay !== undefined || data.aiArticleCount !== undefined || data.rewriteArticleCount !== undefined || data.enableSearchRewrite !== undefined || data.rewriteRounds !== undefined || data.seoKeywords !== undefined || data.articleWordCount !== undefined || data.tavilyApiKey !== undefined || data.tavilyMaxResults !== undefined || data.rewritePrompt !== undefined) {
    config.seoConfig = config.seoConfig || {};
    if (data.autoPostEnabled !== undefined) config.seoConfig.autoPublish = data.autoPostEnabled;
    if (data.autoPostTime !== undefined) config.seoConfig.publishTime = data.autoPostTime;
    if (data.autoPostInterval !== undefined) config.seoConfig.publishInterval = data.autoPostInterval;
    if (data.postsPerDay !== undefined) config.seoConfig.postsPerDay = data.postsPerDay;
    if (data.aiArticleCount !== undefined) config.seoConfig.aiArticleCount = data.aiArticleCount;
    if (data.rewriteArticleCount !== undefined) config.seoConfig.rewriteArticleCount = data.rewriteArticleCount;
    if (data.enableSearchRewrite !== undefined) config.seoConfig.enableSearchRewrite = data.enableSearchRewrite;
    if (data.rewriteRounds !== undefined) config.seoConfig.rewriteRounds = data.rewriteRounds;
    if (data.seoKeywords !== undefined) config.seoConfig.keywords = data.seoKeywords;
    if (data.articleWordCount !== undefined) config.seoConfig.articleWordCount = data.articleWordCount;
    if (data.rewritePrompt !== undefined) config.seoConfig.rewritePrompt = data.rewritePrompt;
    // Tavily 在线搜索配置
    if (data.tavilyApiKey !== undefined || data.tavilyMaxResults !== undefined) {
      config.tavilyConfig = config.tavilyConfig || {};
      if (data.tavilyApiKey !== undefined) config.tavilyConfig.apiKey = data.tavilyApiKey;
      if (data.tavilyMaxResults !== undefined) config.tavilyConfig.maxResults = data.tavilyMaxResults;
    }
  }
  
  await saveConfig(config);
  res.json({ success: true });
});

// 修改密码
app.post('/api/admin/change-password', verifyToken, async (req, res) => {
  // 兼容前端两种字段名: oldPassword 或 currentPassword
  const { email: bodyEmail, oldPassword, currentPassword, newPassword } = req.body;
  const actualOldPassword = oldPassword || currentPassword;
  // 如果前端没传 email，从 JWT token 中获取
  const email = bodyEmail || req.user?.email;
  const config = await getConfig();

  const admins = config.admins || [];
  const adminIndex = admins.findIndex(a => a.email === email);

  if (adminIndex === -1) {
    return res.status(404).json({ success: false, message: '管理员不存在' });
  }

  // 支持 bcrypt hash 和明文两种格式的旧密码验证
  const stored = admins[adminIndex].password;
  let passwordMatch = false;
  if (stored.startsWith('$2a$') || stored.startsWith('$2b$')) {
    passwordMatch = await bcrypt.compare(actualOldPassword, stored);
  } else {
    passwordMatch = (stored === actualOldPassword);
  }

  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: '旧密码错误' });
  }

  // 新密码用 bcrypt 加密存储
  admins[adminIndex].password = await bcrypt.hash(newPassword, 10);
  admins[adminIndex].needsPasswordChange = false;
  config.admins = admins;

  await saveConfig(config);
  res.json({ success: true, message: '密码修改成功' });
});

// 获取管理员列表
app.get('/api/admin/admins', verifyToken, async (req, res) => {
  try {
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 返回管理员信息（隐藏密码）
    const sanitizedAdmins = admins.map(admin => ({
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt,
      needsPasswordChange: admin.needsPasswordChange
    }));
    
    res.json({ success: true, admins: sanitizedAdmins });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取管理员列表失败' });
  }
});

// 邀请新管理员
app.post('/api/admin/invite', verifyToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ success: false, message: '邮箱和姓名不能为空' });
    }
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 检查是否已存在
    if (admins.find(a => a.email === email)) {
      return res.status(400).json({ success: false, message: '该邮箱已被注册为管理员' });
    }
    
    // 生成临时密码（8位随机字符）
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();
    
    // 添加新管理员
    admins.push({
      email,
      name,
      password: tempPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
      needsPasswordChange: true
    });
    
    config.admins = admins;
    await saveConfig(config);
    
    // 发送邀请邮件
    const emailConfig = config.emailConfig;
    const brandConfig = config.brandConfig;
    
    if (!emailConfig || !emailConfig.user || !emailConfig.pass) {
      return res.status(500).json({ success: false, message: '邮件配置未完成，无法发送邀请邮件' });
    }
    
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure !== false,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass
      }
    });
    
    const websiteUrl = brandConfig?.websiteUrl || '';
    const brandName = brandConfig?.name || '管理后台';
    const loginUrl = websiteUrl ? `${websiteUrl}/login.html` : '（请在后台品牌配置中设置 websiteUrl）';
    
    await transporter.sendMail({
      from: emailConfig.from,
      to: email,
      subject: `${brandConfig?.emailSubjectPrefix || ''}${brandName} - 管理员邀请`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">欢迎加入 ${brandName}</h2>
          <p>你好 ${name}，</p>
          <p>你已被邀请成为 <strong>${brandName}</strong> 的管理员。</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>登录信息：</strong></p>
            <p style="margin: 5px 0;">邮箱：<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${email}</code></p>
            <p style="margin: 5px 0;">临时密码：<code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
          </div>
          <p>请点击下方按钮登录管理后台：</p>
          <a href="${loginUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0;">登录管理后台</a>
          <p style="color: #ef4444; font-size: 14px;">⚠️ <strong>重要：</strong>首次登录后请立即修改密码！</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">如果按钮无法点击，请复制以下链接到浏览器：<br>${loginUrl}</p>
        </div>
      `
    });
    
    res.json({ success: true, message: '邀请邮件已发送' });
  } catch (error) {
    console.error('邀请管理员失败:', error);
    res.status(500).json({ success: false, message: '邀请失败: ' + error.message });
  }
});

// 删除管理员
app.post('/api/admin/remove', verifyToken, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: '邮箱不能为空' });
    }
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 不允许删除第一个管理员（主管理员）
    if (admins.length > 0 && admins[0].email === email) {
      return res.status(403).json({ success: false, message: '不能删除主管理员' });
    }
    
    const newAdmins = admins.filter(a => a.email !== email);
    
    if (newAdmins.length === admins.length) {
      return res.status(404).json({ success: false, message: '管理员不存在' });
    }
    
    config.admins = newAdmins;
    await saveConfig(config);
    
    res.json({ success: true, message: '管理员已删除' });
  } catch (error) {
    console.error('删除管理员失败:', error);
    res.status(500).json({ success: false, message: '删除失败: ' + error.message });
  }
});

// 测试LLM API配置
app.post('/api/admin/test-llm', verifyToken, async (req, res) => {
  try {
    const { apiKey, apiEndpoint, model } = req.body || {};
    if (!apiKey || !apiEndpoint) {
      return res.json({ success: false, message: '请提供 API Key 和 API Endpoint' });
    }
    const result = await testLLMConfig({ apiKey, apiEndpoint, model });
    res.json(result);
  } catch (error) {
    res.json({ success: false, message: error.message || '测试失败' });
  }
});

// 获取文章列表
app.get('/api/admin/articles', verifyToken, async (req, res) => {
  const articles = await getArticles();
  res.json(articles);
});

// 获取留言列表
app.get('/api/admin/contacts', verifyToken, async (req, res) => {
  const contacts = await getContacts();
  res.json(contacts);
});

// 生成文章
app.post('/api/admin/generate-article', verifyToken, async (req, res) => {
  try {
    const config = await getConfig();
    
    // 准备LLM配置
    const llmConfig = config.llmApiKey && config.llmApiEndpoint ? {
      apiKey: config.llmApiKey,
      apiEndpoint: config.llmApiEndpoint,
      model: config.llmModel
    } : null;
    
    // 准备图片配置（优先使用嵌套的imageConfig，兼容旧的扁平结构）
    const imageConfig = {
      useAI: config.imageConfig?.useAI ?? config.imageUseAI,
      apiKey: config.imageConfig?.aiApiKey ?? config.imageApiKey,
      unsplashApiKey: config.imageConfig?.unsplashApiKey ?? config.unsplashApiKey
    };
    
    // 准备字数配置
    const wordCount = config.seoConfig?.articleWordCount ?? config.articleWordCount ?? 1000;
    
    const seoKeywords = config.seoConfig?.keywords || config.seoKeywords || null;

    console.log('[DEBUG] config.unsplashApiKey:', config.unsplashApiKey);
    console.log('[DEBUG] imageConfig:', imageConfig);
    console.log('[DEBUG] wordCount:', wordCount);
    console.log('[DEBUG] seoKeywords:', seoKeywords);

    // 获取已有文章用于图片去重
    const existingArticles = await getArticles();
    const dedupConfig = {
      enableImageDeduplication: config.imageConfig?.enableDeduplication ?? config.enableDeduplication ?? false,
      deduplicationWindow: config.imageConfig?.deduplicationWindow ?? config.deduplicationWindow ?? 5
    };
    console.log('[DEBUG] dedupConfig:', dedupConfig);

    const article = await generateArticleNew(llmConfig, imageConfig, dedupConfig, wordCount, seoKeywords, existingArticles);
    existingArticles.unshift(article);
    await saveArticles(existingArticles);
    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成搜索改写文章（手动触发）
app.post('/api/admin/generate-rewrite-article', verifyToken, async (req, res) => {
  try {
    const config = await getConfig();
    
    // 准备LLM配置（优先使用嵌套的llmConfig）
    const llmConfig = config.llmConfig?.apiKey ? {
      apiKey: config.llmConfig.apiKey,
      apiEndpoint: config.llmConfig.baseURL,
      model: config.llmConfig.model
    } : (config.llmApiKey && config.llmApiEndpoint ? {
      apiKey: config.llmApiKey,
      apiEndpoint: config.llmApiEndpoint,
      model: config.llmModel
    } : null);
    
    if (!llmConfig) {
      return res.status(400).json({ success: false, error: '请先配置 LLM API' });
    }
    
    // 准备图片配置
    const imageConfig = {
      useAI: config.imageConfig?.useAI ?? config.imageUseAI,
      apiKey: config.imageConfig?.aiApiKey ?? config.imageApiKey,
      unsplashApiKey: config.imageConfig?.unsplashApiKey ?? config.unsplashApiKey
    };
    
    // 准备 Tavily 配置
    const tavilyConfig = (config.tavilyConfig && config.tavilyConfig.apiKey)
      ? config.tavilyConfig : null;
    
    const rewriteRounds = config.seoConfig?.rewriteRounds || config.rewriteRounds || 3;
    const wordCount = config.seoConfig?.articleWordCount ?? config.articleWordCount ?? 1000;

    console.log('[改写文章] 开始生成，改写轮数:', rewriteRounds, '字数:', wordCount);
    if (tavilyConfig) console.log('[改写文章] 使用 Tavily API 搜索');

    const seoKeywords = config.seoConfig?.keywords || config.seoKeywords || null;
    const rewritePrompt = config.seoConfig?.rewritePrompt || null;

    // 获取已有文章用于图片去重
    const existingArticles = await getArticles();
    const dedupConfig2 = {
      enableImageDeduplication: config.imageConfig?.enableDeduplication ?? config.enableDeduplication ?? false,
      deduplicationWindow: config.imageConfig?.deduplicationWindow ?? config.deduplicationWindow ?? 5,
      tavilyConfig,
      googleApiKey: config.googleApiKey,
      googleSearchEngineId: config.googleSearchEngineId
    };

    // 使用 generateRewrittenArticle（已包含搜索+改写+配图完整流程）
    const { generateRewrittenArticle } = require('./article-generator');
    const article = await generateRewrittenArticle(
      llmConfig,
      imageConfig,
      rewriteRounds,
      dedupConfig2,
      seoKeywords,
      wordCount,
      rewritePrompt
    );

    existingArticles.unshift(article);
    await saveArticles(existingArticles);
    
    res.json({ success: true, article });
  } catch (error) {
    console.error('[改写文章] 失败:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除文章
app.delete('/api/admin/articles/:id', verifyToken, async (req, res) => {
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

// 设备类型检测函数
function detectDevice(userAgent) {
  if (!userAgent) return '未知';
  
  const ua = userAgent.toLowerCase();
  
  // 检测移动设备
  if (/(android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini)/i.test(ua)) {
    if (/(ipad|tablet|playbook|silk)/i.test(ua)) {
      return '平板';
    }
    return '手机';
  }
  
  // 默认为电脑
  return '电脑';
}

// 提交联系表单
app.post('/api/contact', async (req, res) => {
  try {
    const { captchaId, captchaText, captcha, ...contactData } = req.body;
    
    // 兼容两种字段名：captchaText（新）和 captcha（旧）
    const userCaptcha = captchaText || captcha;
    
    // 验证验证码（强制要求）
    if (!captchaId || !userCaptcha) {
      return res.status(400).json({ success: false, error: '请输入验证码' });
    }
    
    const stored = captchaStore.get(captchaId);
    if (!stored || stored.expires < Date.now()) {
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }
    if (stored.text !== userCaptcha.toLowerCase()) {
      return res.status(400).json({ success: false, error: '验证码错误或已过期' });
    }
    // 验证成功后删除验证码
    captchaStore.delete(captchaId);
    
    const config = await getConfig();
    
    // 检测设备类型
    const userAgent = req.headers['user-agent'];
    const deviceType = detectDevice(userAgent);
    
    // 构造来源信息（支持UTM参数）
    let sourceInfo = '直接访问';
    let trafficType = 'direct'; // direct, organic, paid
    let utmData = {};
    
    if (contactData.trafficSource) {
      const ts = contactData.trafficSource;
      // 兼容两种字段命名：前端传 source/medium/campaign/keyword，或标准 utm_source/utm_medium 等
      utmData = {
        utm_source: ts.utm_source || ts.source || '',
        utm_medium: ts.utm_medium || ts.medium || '',
        utm_campaign: ts.utm_campaign || ts.campaign || '',
        utm_term: ts.utm_term || ts.keyword || '',
        utm_content: ts.utm_content || '',
        referrer: ts.referrer || ''
      };
      
      // 判断流量类型
      const source = (utmData.utm_source || '').toLowerCase();
      const medium = (utmData.utm_medium || '').toLowerCase();
      const referrer = (utmData.referrer || '').toLowerCase();
      
      // 搜索引擎列表
      const searchEngines = ['baidu', 'google', 'bing', 'sogou', 'so.com', 'sm.cn', 'yandex', 'duckduckgo', 'yahoo'];
      const isSearchEngine = searchEngines.some(se => source.includes(se));
      
      // referrer 中的搜索引擎识别（当 utm_source 为空时使用）
      const referrerEngineMap = {
        'baidu.com': 'Baidu', 'google.': 'Google', 'bing.com': 'Bing',
        'sogou.com': 'Sogou', 'so.com': '360搜索', 'sm.cn': '神马搜索',
        'yahoo.com': 'Yahoo', 'yandex.': 'Yandex', 'duckduckgo.com': 'DuckDuckGo'
      };
      
      // 付费广告判断（优先级最高）：medium 包含 cpc/ppc/paid/ad，或 source 是百度且 medium 不为空
      const isPaid = medium.includes('cpc') || medium.includes('ppc') ||
                     medium.includes('paid') || medium.includes('ad') ||
                     (source.includes('baidu') && medium && medium !== 'organic');
      
      if (isPaid) {
        trafficType = 'paid';
        const sourceName = utmData.utm_source || '未知';
        sourceInfo = `💰 ${sourceName} 广告`;
      } else if (source && isSearchEngine) {
        trafficType = 'organic';
        sourceInfo = `🔍 ${utmData.utm_source} 自然搜索`;
      } else if (source) {
        trafficType = 'referral';
        sourceInfo = `🔗 ${utmData.utm_source}`;
      } else if (referrer) {
        // utm_source 为空时，尝试从 referrer 识别搜索引擎
        let detectedEngine = null;
        for (const [domain, name] of Object.entries(referrerEngineMap)) {
          if (referrer.includes(domain)) {
            detectedEngine = name;
            break;
          }
        }
        if (detectedEngine) {
          trafficType = 'organic';
          sourceInfo = `🔍 ${detectedEngine} 自然搜索`;
          utmData.utm_source = detectedEngine.toLowerCase();
          utmData.utm_medium = 'organic';
        } else {
          trafficType = 'referral';
          try {
            sourceInfo = `🔗 ${new URL(utmData.referrer).hostname.replace('www.', '')}`;
          } catch {
            sourceInfo = `🔗 ${utmData.referrer}`;
          }
        }
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
      deviceType: deviceType,
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
        <p><strong>客户端类型：</strong>${deviceType}</p>
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
        source: sourceInfo,
        deviceType: deviceType
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
// 测试 Tavily API 连接
app.post('/api/admin/test-tavily', verifyToken, async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ success: false, message: '请提供 Tavily API Key' });
    }
    const axios = require('axios');
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: apiKey,
        query: 'AI教育 智能阅卷',
        search_depth: 'basic',
        max_results: 3
      },
      { timeout: 10000 }
    );
    const results = response.data?.results || [];
    res.json({ success: true, resultCount: results.length, message: 'Tavily API 连接成功' });
  } catch (error) {
    const msg = error.response?.data?.message || error.message || '连接失败';
    res.status(500).json({ success: false, message: msg });
  }
});

async function scheduleArticleGeneration() {
  const config = await getConfig();
  
  // 读取 seoConfig 中的自动发布开关（管理界面保存在此处）
  var autoPublishEnabled = (config.seoConfig && config.seoConfig.autoPublish) ? true : (config.autoPostEnabled || false);
  if (!autoPublishEnabled) {
    console.log("[定时发布] 自动发布未启用，跳过");
    return;
  }
  
  console.log('\n========== 开始自动发布文章 ==========');
  console.log(`搜索改写: ${config.enableSearchRewrite ? '启用' : '禁用'}`);
  
  try {
    // 优先读取 llmConfig 嵌套对象（管理界面保存在此处）
    var _llmKey = (config.llmConfig && config.llmConfig.apiKey) ? config.llmConfig.apiKey : (config.llmApiKey || "");
    var _llmUrl = (config.llmConfig && config.llmConfig.baseURL) ? config.llmConfig.baseURL : (config.llmApiEndpoint || "");
    var _llmModel = (config.llmConfig && config.llmConfig.model) ? config.llmConfig.model : (config.llmModel || "");
    const llmConfig = (_llmKey && _llmUrl) ? {
      apiKey: _llmKey,
      apiEndpoint: _llmUrl,
      model: _llmModel
    } : null;
    
    // 优先读取 imageConfig 嵌套对象
    const imageConfig = {
      useAI: (config.imageConfig && config.imageConfig.useAI) ? config.imageConfig.useAI : (config.imageUseAI || false),
      apiKey: (config.imageConfig && config.imageConfig.aiApiKey) ? config.imageConfig.aiApiKey : (config.imageApiKey || ""),
      unsplashApiKey: (config.imageConfig && config.imageConfig.unsplashApiKey) ? config.imageConfig.unsplashApiKey : (config.unsplashApiKey || "")
    };
    
    // 读取 seoConfig 中的文章数量配置
    var _aiCount = (config.seoConfig && config.seoConfig.aiArticleCount) ? config.seoConfig.aiArticleCount : (config.aiArticleCount || 1);
    var _rewriteCount = (config.seoConfig && config.seoConfig.rewriteArticleCount) ? config.seoConfig.rewriteArticleCount : (config.rewriteArticleCount || 0);
    var _enableRewrite = (config.seoConfig && config.seoConfig.enableSearchRewrite) ? config.seoConfig.enableSearchRewrite : (config.enableSearchRewrite || false);
    var _rewriteRounds = (config.seoConfig && config.seoConfig.rewriteRounds) ? config.seoConfig.rewriteRounds : (config.rewriteRounds || 3);
    
    console.log("[定时发布] LLM配置:", _llmKey ? ("已配置(" + _llmModel + ")") : "未配置");
    
    // 读取 Tavily 配置
    var _tavilyApiKey = (config.tavilyConfig && config.tavilyConfig.apiKey) ? config.tavilyConfig.apiKey : "";
    var _tavilyMaxResults = (config.tavilyConfig && config.tavilyConfig.maxResults) ? config.tavilyConfig.maxResults : 5;
    if (_tavilyApiKey) console.log("[定时发布] Tavily API: 已配置（优先使用）");
    else console.log("[定时发布] Tavily API: 未配置，将使用 Bing 爬取");
    console.log("[定时发布] 图片配置: Unsplash=" + (imageConfig.unsplashApiKey ? "已配置" : "未配置"));
    console.log("[定时发布] 文章数量: AI原创=" + _aiCount + ", 改写=" + _rewriteCount);
    
    // 读取文章字数配置
    var _wordCount = (config.seoConfig && config.seoConfig.articleWordCount) ? config.seoConfig.articleWordCount : (config.articleWordCount || 1000);
    console.log("[定时发布] 目标字数:", _wordCount);
    
    // 读取 SEO 关键词配置
    var _seoKeywords = config.seoConfig?.keywords || config.seoKeywords || null;
    console.log("[定时发布] SEO关键词:", _seoKeywords ? "已配置" : "未配置（使用默认）");

    // 读取改写提示词配置
    var _rewritePrompt = config.seoConfig?.rewritePrompt || null;
    console.log("[定时发布] 改写提示词:", _rewritePrompt ? "自定义" : "默认");

    // 使用新的批量生成功能
    const newArticles = await generateArticles({
      llmConfig,
      imageConfig,
      enableSearchRewrite: _enableRewrite,
      rewriteRounds: _rewriteRounds,
      aiArticleCount: _aiCount,
      rewriteArticleCount: _rewriteCount,
      wordCount: _wordCount,
      seoKeywords: _seoKeywords,
      rewritePrompt: _rewritePrompt,
      tavilyConfig: _tavilyApiKey ? { apiKey: _tavilyApiKey, maxResults: _tavilyMaxResults } : null
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

// 动态定时任务：每分钟检查是否到达配置的发布时间
// 修复：增加 lastPublishDate 防重复机制 + 10分钟补发窗口（防止服务重启错过整点）
cron.schedule('* * * * *', async function() {
  try {
    var cfg = await getConfig();
    var enabled = (cfg.seoConfig && cfg.seoConfig.autoPublish) ? true : (cfg.autoPostEnabled || false);
    if (!enabled) return;
    
    var publishTime = (cfg.seoConfig && cfg.seoConfig.publishTime) ? cfg.seoConfig.publishTime : (cfg.autoPostTime || "09:00");
    var parts = publishTime.split(":");
    var targetHour = parseInt(parts[0], 10);
    var targetMinute = parseInt(parts[1], 10);
    
    var now = new Date();
    var todayStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    
    // 防重复：今天已经发布过则跳过
    var lastPublishDate = (cfg.seoConfig && cfg.seoConfig.lastPublishDate) ? cfg.seoConfig.lastPublishDate : null;
    if (lastPublishDate === todayStr) return;
    
    // 计算当前时间与目标时间的分钟差（支持10分钟补发窗口，防止服务重启错过整点）
    var nowMinutes = now.getHours() * 60 + now.getMinutes();
    var targetMinutes = targetHour * 60 + targetMinute;
    var diffMinutes = nowMinutes - targetMinutes;
    
    if (diffMinutes >= 0 && diffMinutes < 10) {
      console.log("[定时发布] 到达发布时间 " + publishTime + "（延迟" + diffMinutes + "分钟），开始生成文章...");
      // 先记录今天已发布，防止10分钟窗口内重复触发
      if (!cfg.seoConfig) cfg.seoConfig = {};
      cfg.seoConfig.lastPublishDate = todayStr;
      await saveConfig(cfg);
      await scheduleArticleGeneration();
    }
  } catch (err) {
    console.error("[定时发布] 时间检查出错:", err.message);
  }
});
console.log('[定时发布] 定时任务已启动，每分钟检查发布时间');

// SSL证书管理API
app.post('/api/admin/renew-certificate', verifyToken, async (req, res) => {
  try {
    const result = await renewCertificate();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/admin/certificate-info', verifyToken, async (req, res) => {
  try {
    const result = await getCertificateInfo();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试邮件发送API
app.post('/api/admin/test-email', verifyToken, async (req, res) => {
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

// 测试SMTP发送邮件
app.post('/api/admin/test-smtp', verifyToken, async (req, res) => {
  try {
    const config = await getConfig();
    
    // 检查SMTP是否配置
    if (!config.emailConfig || !config.emailConfig.host || !config.emailConfig.user || !config.emailConfig.pass) {
      return res.status(400).json({ 
        success: false, 
        error: 'SMTP未配置，请先配置SMTP信息' 
      });
    }
    
    // 检查接收邮箱是否配置
    if (!config.emailConfig.adminEmail) {
      return res.status(400).json({ 
        success: false, 
        error: '接收邮箱未配置' 
      });
    }
    
    // 发送测试邮件
    const testEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📧 SMTP测试邮件</h1>
        </div>
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            这是一封SMTP配置测试邮件。
          </p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">
            如果您收到这封邮件，说明您的SMTP配置正确！
          </p>
          <div style="margin-top: 30px; padding: 20px; background: white; border-radius: 8px; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #666; font-size: 14px;"><strong>发送时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;"><strong>SMTP服务器:</strong> ${config.emailConfig.host}:${config.emailConfig.port}</p>
          </div>
        </div>
      </div>
    `;
    
    const emailSubject = `${config.emailConfig.emailSubjectPrefix || ''} SMTP测试邮件`.trim();
    const success = await sendEmail(config.emailConfig.adminEmail, emailSubject, testEmailHtml);
    
    if (success) {
      res.json({ success: true, message: '测试邮件发送成功' });
    } else {
      res.status(500).json({ success: false, error: '邮件发送失败，请检查SMTP配置' });
    }
  } catch (error) {
    console.error('测试SMTP失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SSL证书管理API
const { getSSLStatus, renewSSL, setAutoRenew } = require('./cert-manager');

// 获取SSL证书状态
app.get('/api/admin/ssl-status', verifyToken, async (req, res) => {
  try {
    const result = await getSSLStatus();
    res.json(result);
  } catch (error) {
    console.error('Get SSL status error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 续订SSL证书
app.post('/api/admin/ssl-renew', verifyToken, async (req, res) => {
  try {
    const result = await renewSSL();
    res.json(result);
  } catch (error) {
    console.error('Renew SSL error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 设置自动续订
app.post('/api/admin/ssl-auto-renew', verifyToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    const result = await setAutoRenew(enabled);
    res.json(result);
  } catch (error) {
    console.error('Set auto-renew error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 测试飞书机器人
app.post('/api/admin/test-feishu-bot', verifyToken, async (req, res) => {
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
app.post('/api/admin/test-feishu-table', verifyToken, async (req, res) => {
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
    
    const success = await syncToFeishuTable(config, testData);
    
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
app.get('/api/admin/used-urls/count', verifyToken, async (req, res) => {
  try {
    const count = await usedUrlsManager.getUsedUrlCount();
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取所有已使用URL
app.get('/api/admin/used-urls', verifyToken, async (req, res) => {
  try {
    const urls = await usedUrlsManager.getUsedUrls();
    res.json({ success: true, urls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 清空已使用URL
app.post('/api/admin/used-urls/clear', verifyToken, async (req, res) => {
  try {
    await usedUrlsManager.clearUsedUrls();
    res.json({ success: true, message: '已成功清空历史URL' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试Unsplash API
app.post('/api/admin/test-unsplash', verifyToken, async (req, res) => {
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
      
      await sendEmail(email, emailSubject, emailHtml);
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
app.get('/api/admin/admins', verifyToken, async (req, res) => {
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
app.post('/api/admin/admins', verifyToken, async (req, res) => {
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
app.put('/api/admin/admins/:email', verifyToken, async (req, res) => {
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
app.delete('/api/admin/admins/:email', verifyToken, async (req, res) => {
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


// 存储邀请token（生产环境应使用Redis）
const invitationTokens = new Map();

// 发送管理员邀请
app.post('/api/admin/invite', verifyToken, async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ success: false, message: '邮箱和姓名不能为空' });
    }
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 检查邮箱是否已存在
    if (admins.find(a => a.email === email)) {
      return res.status(400).json({ success: false, message: '该邮箱已被使用' });
    }
    
    // 生成邀请token（24小时有效）
    const inviteToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24小时
    
    // 存储邀请信息
    invitationTokens.set(inviteToken, {
      email,
      name,
      expiresAt,
      invitedBy: req.user?.email || 'admin'
    });
    
    // 生成邀请链接
    const inviteLink = `${req.protocol}://${req.get('host')}/admin/accept-invite.html?token=${inviteToken}`;
    
    // 发送邀请邮件
    const brandName = config.brandConfig?.name || '管理后台';
    const emailSubjectPrefix = config.emailConfig?.emailSubjectPrefix || '';
    
    const mailOptions = {
      from: config.emailConfig.from || config.emailConfig.user,
      to: email,
      subject: `${emailSubjectPrefix} 管理员邀请`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 管理员邀请</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              您好，<strong>${name}</strong>！
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              您已被邀请成为 <strong>${brandName}</strong> 的管理员。
            </p>
            
            <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
              请点击下方按钮接受邀请并设置您的密码：
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                接受邀请
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              如果按钮无法点击，请复制以下链接到浏览器：<br>
              <a href="${inviteLink}" style="color: #667eea; word-break: break-all;">${inviteLink}</a>
            </p>
            
            <p style="font-size: 14px; color: #ef4444; margin-top: 20px;">
              ⚠️ 此邀请链接将在 24 小时后失效
            </p>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              如果您没有请求此邀请，请忽略此邮件。
            </p>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ 
      success: true, 
      message: '邀请邮件已发送',
      inviteLink: inviteLink // 仅用于测试，生产环境应删除
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({ success: false, message: '发送邀请失败' });
  }
});

// 验证邀请token
app.get('/api/admin/verify-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const invitation = invitationTokens.get(token);
    
    if (!invitation) {
      return res.status(404).json({ success: false, message: '邀请链接无效' });
    }
    
    if (Date.now() > invitation.expiresAt) {
      invitationTokens.delete(token);
      return res.status(400).json({ success: false, message: '邀请链接已过期' });
    }
    
    res.json({ 
      success: true, 
      email: invitation.email,
      name: invitation.name
    });
  } catch (error) {
    console.error('Error verifying invitation:', error);
    res.status(500).json({ success: false, message: '验证失败' });
  }
});

// 接受邀请并设置密码
app.post('/api/admin/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token和密码不能为空' });
    }
    
    const invitation = invitationTokens.get(token);
    
    if (!invitation) {
      return res.status(404).json({ success: false, message: '邀请链接无效' });
    }
    
    if (Date.now() > invitation.expiresAt) {
      invitationTokens.delete(token);
      return res.status(400).json({ success: false, message: '邀请链接已过期' });
    }
    
    // 验证密码强度
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: '密码至少8位' });
    }
    
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ success: false, message: '密码必须包含字母和数字' });
    }
    
    const config = await getConfig();
    const admins = config.admins || [];
    
    // 检查邮箱是否已存在（防止重复接受）
    if (admins.find(a => a.email === invitation.email)) {
      invitationTokens.delete(token);
      return res.status(400).json({ success: false, message: '该邮箱已被使用' });
    }
    
    // 添加新管理员
    admins.push({
      email: invitation.email,
      name: invitation.name,
      password: password,
      role: 'admin',
      createdAt: new Date().toISOString(),
      needsPasswordChange: false,
      invitedBy: invitation.invitedBy
    });
    
    config.admins = admins;
    await saveConfig(config);
    
    // 删除已使用的邀请token
    invitationTokens.delete(token);
    
    // 生成登录token
    const loginToken = Buffer.from(`${invitation.email}:${password}`).toString('base64');
    
    res.json({ 
      success: true, 
      message: '账号创建成功',
      token: loginToken,
      email: invitation.email,
      name: invitation.name
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ success: false, message: '接受邀请失败' });
  }
});


// ==================== 配置管理API ====================

// Removed duplicate GET/POST config endpoints - using the ones defined earlier


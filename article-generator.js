const axios = require('axios');
const { OpenAI } = require('openai');
const { searchAndFetchArticles, selectBestArticle } = require('./article-search');
const { rewriteArticle } = require('./article-rewriter');
const { UnsplashFetcher } = require('./unsplash-fetcher-simple');

// SEO关键词列表
const KEYWORDS = [
  'AI阅卷',
  '智能批改',
  '自动阅卷系统',
  '教育AI',
  '智能教育',
  '作业批改',
  '试卷分析',
  '教学评估',
  '学情分析',
  '个性化教学'
];

// 本地图片库
const LOCAL_IMAGES = [
  '/images/articles/ai-classroom-1.jpg',
  '/images/articles/ai-classroom-2.jpg',
  '/images/articles/ai-grading-1.jpg',
  '/images/articles/ai-education-1.jpg',
  '/images/articles/teacher-ai-1.jpg'
];

// 获取本地图片（随机选择）
function getLocalImage(keyword) {
  // 根据关键词选择最相关的图片
  const keywordLower = keyword.toLowerCase();
  
  if (keywordLower.includes('阅卷') || keywordLower.includes('批改') || keywordLower.includes('grading')) {
    return '/images/articles/ai-grading-1.jpg';
  } else if (keywordLower.includes('课堂') || keywordLower.includes('classroom')) {
    return Math.random() > 0.5 ? '/images/articles/ai-classroom-1.jpg' : '/images/articles/ai-classroom-2.jpg';
  } else if (keywordLower.includes('教师') || keywordLower.includes('teacher')) {
    return '/images/articles/teacher-ai-1.jpg';
  } else {
    // 随机选择一张图片
    return LOCAL_IMAGES[Math.floor(Math.random() * LOCAL_IMAGES.length)];
  }
}

// 获取Unsplash免费图片（保留作为备用）
async function getUnsplashImage(keyword) {
  try {
    const response = await axios.get(`https://source.unsplash.com/800x600/?${encodeURIComponent(keyword)},education,technology`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302
    });
    return response.headers.location || `https://source.unsplash.com/800x600/?education`;
  } catch (error) {
    return `https://source.unsplash.com/800x600/?education`;
  }
}

// 获取唯一图片（Unsplash → AI生成 → 本地图片）
async function getUniqueArticleImage(keyword, imageConfig = null) {
  console.log(`\n获取文章配图: ${keyword}`);
  console.log(`imageConfig:`, imageConfig);
  
  // 方案1: 优先使用Unsplash（每张图片都不重复）
  if (imageConfig && imageConfig.unsplashApiKey) {
    console.log(`尝试使用Unsplash API: ${imageConfig.unsplashApiKey.substring(0, 10)}...`);
    try {
      const unsplashFetcher = new UnsplashFetcher(imageConfig.unsplashApiKey);
      const image = await unsplashFetcher.getUniqueImage(keyword);
      console.log(`✓ 使用Unsplash图片: ${image.webPath}`);
      return {
        url: image.webPath,
        source: 'unsplash',
        author: image.author,
        authorUrl: image.authorUrl,
        unsplashUrl: image.unsplashUrl
      };
    } catch (error) {
      console.log(`Unsplash图片获取失败: ${error.message}，尝试备用方案`);
    }
  }
  
  // 方案2: 备用 - AI生成图片
  if (imageConfig && imageConfig.useAI && imageConfig.apiKey) {
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: imageConfig.apiKey });
      
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: `A professional, modern illustration about ${keyword} in education technology. Clean, minimalist design with blue and purple colors. Show AI and education elements in a harmonious way. NO text, NO logos, NO brand names, NO watermarks.`,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
      });
      
      console.log(`✓ 使用AI生成图片`);
      return {
        url: imageResponse.data[0].url,
        source: 'ai'
      };
    } catch (error) {
      console.log(`AI图片生成失败: ${error.message}，使用本地图片`);
    }
  }
  
  // 方案3: 最后备用 - 本地图片（带去重）
  const localImage = getLocalImage(keyword);
  console.log(`✓ 使用本地图片: ${localImage}`);
  return {
    url: localImage,
    source: 'local'
  };
}

// 使用LLM生成文章
async function generateArticleWithLLM(llmConfig, keyword, wordCount = 1000) {
  try {
    let endpoint = llmConfig.apiEndpoint;
    if (!endpoint.includes('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }
    
    const response = await axios.post(
      endpoint,
      {
        model: llmConfig.model || 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的教育科技内容创作者，擅长撰写关于AI教育、智能阅卷等主题的SEO优化文章。'
          },
          {
            role: 'user',
            content: `请写一篇关于"${keyword}"的SEO文章，要求：
1. 字数约${wordCount}字（误差±10%）
2. 包含吸引人的标题
3. 内容专业、实用，适合教育工作者阅读
4. 自然融入关键词"${keyword}"
5. 包含实际应用场景和案例
6. **重要**：文章必须分段，每段3-5句话，段落之间用空行分隔
7. **重要**：使用\n\n来分隔段落，确保文章有清晰的段落结构
8. 以JSON格式返回，包含title和content字段，content中使用\n\n分隔段落`
          }
        ],
        temperature: 0.8,
      },
      {
        headers: {
          'Authorization': `Bearer ${llmConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    const content = response.data.choices[0].message.content;
    
    // 尝试解析JSON
    try {
      return JSON.parse(content);
    } catch (e) {
      // 如果不是JSON格式，尝试提取标题和内容
      const lines = content.split('\n').filter(line => line.trim());
      return {
        title: lines[0].replace(/^#+\s*/, '').replace(/^["']|["']$/g, ''),
        content: lines.slice(1).join('\n\n')
      };
    }
  } catch (error) {
    console.error('LLM API调用失败:', error.message);
    throw error;
  }
}

// 生成AI原创文章
async function generateArticle(llmConfig = null, imageConfig = null, dedupConfig = null, wordCount = 1000) {
  console.log('[generateArticle] 收到的imageConfig:', JSON.stringify(imageConfig));
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  
  let articleData;
  let imageUrl;
  
  // 生成文章内容
  if (llmConfig && llmConfig.apiKey && llmConfig.apiEndpoint) {
    try {
      articleData = await generateArticleWithLLM(llmConfig, keyword, wordCount);
    } catch (error) {
      console.error('使用配置的LLM失败，使用默认内容:', error.message);
      articleData = generateDefaultArticle(keyword);
    }
  } else {
    // 使用环境变量中的OpenAI配置
    try {
      const { OpenAI } = require('openai');
      const openai = new OpenAI();
      
      const articleResponse = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的教育科技内容创作者，擅长撰写关于AI教育、智能阅卷等主题的SEO优化文章。'
          },
          {
            role: 'user',
            content: `请写一篇关于"${keyword}"的SEO文章，要求：
1. 字数约${wordCount}字（误差±10%）
2. 包含吸引人的标题
3. 内容专业、实用，适合教育工作者阅读
4. 自然融入关键词"${keyword}"
5. 包含实际应用场景和案例
6. **重要**：文章必须分段，每段3-5句话，段落之间用空行分隔
7. **重要**：使用\n\n来分隔段落，确保文章有清晰的段落结构
8. 以JSON格式返回，包含title和content字段，content中使用\n\n分隔段落`
          }
        ],
        temperature: 0.8,
      });
      
      articleData = JSON.parse(articleResponse.choices[0].message.content);
    } catch (error) {
      console.error('使用默认OpenAI失败:', error.message);
      articleData = generateDefaultArticle(keyword);
    }
  }
  
  // 生成图片（优先Unsplash，备用AI生成，最后本地图片）
  const imageData = await getUniqueArticleImage(keyword, imageConfig);
  
  return {
    id: Date.now().toString(),
    title: articleData.title,
    content: articleData.content,
    imageUrl: imageData.url || imageData,  // 兼容旧格式
    imageSource: imageData.source,
    imageAuthor: imageData.author,
    imageAuthorUrl: imageData.authorUrl,
    imageUnsplashUrl: imageData.unsplashUrl,
    keyword: keyword,
    createdAt: new Date().toISOString(),
    published: true,
    type: 'ai_generated'  // 标记文章类型
  };
}

// 生成搜索改写文章
async function generateRewrittenArticle(llmConfig = null, imageConfig = null, rewriteRounds = 3, dedupConfig = null) {
  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
  
  console.log(`\n========== 开始生成搜索改写文章 ==========`);
  console.log(`关键词: ${keyword}`);
  console.log(`改写轮数: ${rewriteRounds}`);
  
  try {
    // 1. 搜索相关文章
    console.log('\n步骤1: 搜索相关文章...');
    const articles = await searchAndFetchArticles(keyword);
    
    if (!articles || articles.length === 0) {
      console.log('未找到相关文章，回退到AI原创生成');
      return await generateArticle(llmConfig, imageConfig);
    }
    
    // 2. 选择最佳文章
    console.log(`\n步骤2: 从 ${articles.length} 篇文章中选择最佳文章...`);
    const bestArticle = selectBestArticle(articles, keyword);
    console.log(`选中文章: ${bestArticle.title}`);
    console.log(`文章长度: ${bestArticle.length} 字`);
    console.log(`来源URL: ${bestArticle.url}`);
    
    // 记录已使用的URL
    const usedUrlsManager = require('./used-urls-manager');
    await usedUrlsManager.addUsedUrl(bestArticle.url, keyword);
    
    // 3. 深度改写文章
    console.log(`\n步骤3: 开始深度改写（${rewriteRounds}轮）...`);
    const rewrittenData = await rewriteArticle(
      bestArticle.content,
      keyword,
      llmConfig,
      rewriteRounds
    );
    
    console.log(`\n改写完成！`);
    console.log(`新标题: ${rewrittenData.title}`);
    console.log(`新内容长度: ${rewrittenData.content.length} 字`);
    
    // 4. 生成图片（优先Unsplash，备用AI生成，最后本地图片）
    console.log(`\n步骤4: 生成配图...`);
    const imageData = await getUniqueArticleImage(keyword, imageConfig);
    
    console.log(`========== 搜索改写文章生成完成 ==========\n`);
    
    return {
      id: Date.now().toString() + '_rewritten',
      title: rewrittenData.title,
      content: rewrittenData.content,
      imageUrl: imageData.url || imageData,  // 兼容旧格式
      imageSource: imageData.source,
      imageAuthor: imageData.author,
      imageAuthorUrl: imageData.authorUrl,
      imageUnsplashUrl: imageData.unsplashUrl,
      keyword: keyword,
      createdAt: new Date().toISOString(),
      published: true,
      type: 'search_rewritten',  // 标记文章类型
      sourceUrl: bestArticle.url,  // 保存原文URL
      rewriteRounds: rewriteRounds  // 保存改写轮数
    };
  } catch (error) {
    console.error('搜索改写失败:', error.message);
    console.log('回退到AI原创生成');
    return await generateArticle(llmConfig, imageConfig);
  }
}

// 批量生成文章（支持搜索改写）
async function generateArticles(config = {}) {
  const {
    llmConfig = null,
    imageConfig = null,
    enableSearchRewrite = false,
    rewriteRounds = 3,
    aiArticleCount = 1,
    rewriteArticleCount = 0,
    enableImageDeduplication = false,
    deduplicationWindow = 5,
    wordCount = 1000
  } = config;
  
  // 构建去重配置对象
  const dedupConfig = {
    enableImageDeduplication,
    deduplicationWindow
  };
  
  const articles = [];
  const totalCount = aiArticleCount + rewriteArticleCount;
  
  console.log(`\n========== 开始批量生成文章 ==========`);
  console.log(`AI原创: ${aiArticleCount} 篇`);
  console.log(`搜索改写: ${rewriteArticleCount} 篇`);
  console.log(`总数量: ${totalCount} 篇`);
  
  let currentIndex = 0;
  
  // 生成AI原创文章
  for (let i = 0; i < aiArticleCount; i++) {
    currentIndex++;
    console.log(`\n[${currentIndex}/${totalCount}] 生成AI原创文章...`);
    const aiArticle = await generateArticle(llmConfig, imageConfig, dedupConfig, wordCount);
    articles.push(aiArticle);
    console.log(`✓ AI原创文章生成完成: ${aiArticle.title}`);
    
    // 等待1秒，避免ID冲突
    if (currentIndex < totalCount) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // 生成搜索改写文章
  if (enableSearchRewrite && rewriteArticleCount > 0) {
    for (let i = 0; i < rewriteArticleCount; i++) {
      currentIndex++;
      console.log(`\n[${currentIndex}/${totalCount}] 生成搜索改写文章...`);
      const rewrittenArticle = await generateRewrittenArticle(llmConfig, imageConfig, rewriteRounds, dedupConfig);
      articles.push(rewrittenArticle);
      console.log(`✓ 搜索改写文章生成完成: ${rewrittenArticle.title}`);
      
      // 等待1秒，避免ID冲突
      if (currentIndex < totalCount) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else if (rewriteArticleCount > 0) {
    console.log(`\n警告: 未启用搜索改写功能，但配置了改写文章数量，将被忽略`);
  }
  
  console.log(`\n========== 批量生成完成，共 ${articles.length} 篇 ==========\n`);
  
  return articles;
}

// 生成默认文章（当API失败时）
function generateDefaultArticle(keyword) {
  const titles = [
    `${keyword}：教育智能化的新趋势`,
    `如何利用${keyword}提升教学效率`,
    `${keyword}系统的应用与实践`,
    `探索${keyword}在现代教育中的价值`,
    `${keyword}：让教学评估更科学`
  ];
  
  const title = titles[Math.floor(Math.random() * titles.length)];
  
  const content = `随着人工智能技术的快速发展，${keyword}正在成为教育领域的重要创新方向。通过AI技术，教师可以大幅提升工作效率，学生也能获得更及时、更精准的学习反馈。

${keyword}系统能够自动识别学生答卷中的文字和图形，准确判断答案的正确性，并给出详细的评分依据。这不仅节省了教师大量的批改时间，还能确保评分的客观性和一致性。

在实际应用场景中，${keyword}展现出了多方面的优势。首先，它能够处理大规模的试卷批改任务，在考试季节为学校减轻了巨大的工作压力。其次，系统提供的数据分析功能，帮助教师深入了解学生的学习情况，发现教学中的薄弱环节。

许多学校和教育机构已经开始采用${keyword}技术。教师们普遍反映，使用智能阅卷系统后，他们有更多时间关注学生的个性化辅导，教学质量得到了显著提升。学生们也因为能够更快地获得作业反馈而提高了学习积极性。

技术的进步还带来了更多可能性。现代${keyword}系统不仅能够批改客观题，对于主观题的评分也越来越准确。通过自然语言处理和机器学习技术，系统能够理解答案的语义，给出合理的评分建议。

当然，${keyword}并不是要取代教师，而是作为教师的得力助手。系统处理重复性的批改工作，让教师有更多精力投入到教学设计和学生指导中。这种人机协作的模式，正在重塑传统的教学评估方式。

展望未来，${keyword}技术将会变得更加智能和人性化。随着大数据和人工智能的深度融合，系统将能够提供更精准的学情分析，为个性化教学提供强有力的数据支持，真正实现因材施教的教育理想。`;

  return { title, content };
}

// 测试LLM API配置
async function testLLMConfig(config) {
  try {
    // 如果endpoint不包含/chat/completions，自动补全
    let endpoint = config.apiEndpoint;
    if (!endpoint.includes('/chat/completions')) {
      endpoint = endpoint.replace(/\/$/, '') + '/chat/completions';
    }
    
    const response = await axios.post(
      endpoint,
      {
        model: config.model || 'gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: '请回复"测试成功"'
          }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      message: '连接成功',
      response: response.data.choices[0].message.content
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data?.error?.message || error.message
    };
  }
}

module.exports = {
  generateArticle,
  generateRewrittenArticle,
  generateArticles,
  testLLMConfig,
  getUnsplashImage
};

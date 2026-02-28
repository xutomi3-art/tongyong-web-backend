const axios = require('axios');
const cheerio = require('cheerio');
const usedUrlsManager = require('./used-urls-manager');

/**
 * 文章搜索模块
 * 负责从网上搜索相关文章并提取内容
 */

// 使用Bing搜索API（免费额度更高）
async function searchArticlesWithBing(keyword) {
  try {
    // 构建搜索查询
    const query = `${keyword} 教育 AI 智能`;
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=10`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const urls = [];
    
    // 提取搜索结果链接
    $('.b_algo h2 a').each((i, elem) => {
      if (i < 5) {  // 只取前5个结果
        const url = $(elem).attr('href');
        if (url && url.startsWith('http')) {
          urls.push(url);
        }
      }
    });
    
    return urls;
  } catch (error) {
    console.error('Bing搜索失败:', error.message);
    return [];
  }
}

// 使用Google自定义搜索（需要API key）
async function searchArticlesWithGoogle(keyword, apiKey, searchEngineId) {
  try {
    const query = `${keyword} 教育 AI 智能`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.items) {
      return response.data.items.map(item => item.link);
    }
    
    return [];
  } catch (error) {
    console.error('Google搜索失败:', error.message);
    return [];
  }
}

// 使用 Tavily API 搜索（优先，返回结构化内容）
async function searchArticlesWithTavily(keyword, apiKey, maxResults = 5) {
  try {
    const query = `${keyword} 教育 AI 智能`;
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: apiKey,
        query: query,
        search_depth: 'advanced',
        include_answer: false,
        include_raw_content: true,
        max_results: maxResults
      },
      { timeout: 15000 }
    );
    const results = response.data?.results || [];
    // 将 Tavily 结果转换为统一格式
    return results
      .filter(r => r.raw_content && r.raw_content.length > 300)
      .map(r => ({
        url: r.url,
        title: r.title || '',
        content: r.raw_content || r.content || '',
        length: (r.raw_content || r.content || '').length
      }));
  } catch (error) {
    console.error('Tavily搜索失败:', error.message);
    return [];
  }
}

// 抓取文章内容
async function fetchArticleContent(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000,
      maxContentLength: 1024 * 1024 * 5  // 限制5MB
    });
    
    const $ = cheerio.load(response.data);
    
    // 移除脚本、样式等无关内容
    $('script, style, nav, header, footer, aside, .ad, .advertisement').remove();
    
    // 尝试多种常见的文章容器选择器
    let content = '';
    const selectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '#content',
      '.article-body'
    ];
    
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }
    
    // 如果没有找到特定容器，提取body中的段落
    if (!content || content.length < 200) {
      content = $('body p').map((i, el) => $(el).text()).get().join('\n\n');
    }
    
    // 清理内容
    content = content
      .replace(/\s+/g, ' ')  // 合并多余空格
      .replace(/\n{3,}/g, '\n\n')  // 合并多余换行
      .trim();
    
    // 提取标题
    let title = $('h1').first().text() || $('title').text() || '';
    title = title.trim();
    
    return {
      url,
      title,
      content,
      length: content.length
    };
  } catch (error) {
    console.error(`抓取文章失败 ${url}:`, error.message);
    return null;
  }
}

// 搜索并获取文章内容（主函数）
async function searchAndFetchArticles(keyword, config = {}) {
  try {
    console.log(`开始搜索关键词: ${keyword}`);
    
    // 优先使用 Tavily API（配置了则直接返回结构化内容，无需再爬取）
    if (config.tavilyConfig && config.tavilyConfig.apiKey) {
      console.log("使用 Tavily API 搜索文章...");
      const tavilyArticles = await searchArticlesWithTavily(
        keyword,
        config.tavilyConfig.apiKey,
        config.tavilyConfig.maxResults || 5
      );
      if (tavilyArticles.length > 0) {
        // 过滤已使用的 URL
        const tavilyUrls = tavilyArticles.map(a => a.url);
        const unusedUrls = await usedUrlsManager.filterUnusedUrls(tavilyUrls);
        const unusedArticles = tavilyArticles.filter(a => unusedUrls.includes(a.url));
        if (unusedArticles.length > 0) {
          console.log(`Tavily 返回 ${unusedArticles.length} 篇未使用文章`);
          return unusedArticles;
        }
      }
      console.log("Tavily 未返回有效结果，降级到 Bing 爬取...");
    }

    let urls = [];
    
    // 优先使用Google搜索（如果配置了API key）
    if (config.googleApiKey && config.googleSearchEngineId) {
      urls = await searchArticlesWithGoogle(keyword, config.googleApiKey, config.googleSearchEngineId);
    }
    
    // 如果Google搜索失败或未配置，使用Bing
    if (urls.length === 0) {
      urls = await searchArticlesWithBing(keyword);
    }
    
    if (urls.length === 0) {
      console.log('未找到相关文章');
      return [];
    }
    
    // 过滤已使用的URL
    const unusedUrls = await usedUrlsManager.filterUnusedUrls(urls);
    
    if (unusedUrls.length === 0) {
      console.log('所有搜索结果都已使用过，请清空历史或更换关键词');
      return [];
    }
    
    console.log(`找到 ${unusedUrls.length} 篇未使用的文章，开始抓取内容...`);
    
    // 并发抓取文章内容
    const articles = await Promise.all(
      unusedUrls.map(url => fetchArticleContent(url))
    );
    
    // 过滤掉抓取失败或内容太短的文章
    const validArticles = articles.filter(article => 
      article && article.content && article.content.length > 500
    );
    
    console.log(`成功抓取 ${validArticles.length} 篇有效文章`);
    
    return validArticles;
  } catch (error) {
    console.error('搜索文章失败:', error.message);
    return [];
  }
}

// 选择最佳文章（内容最长且相关度最高）
function selectBestArticle(articles, keyword) {
  if (!articles || articles.length === 0) {
    return null;
  }
  
  // 计算相关度分数
  const scoredArticles = articles.map(article => {
    let score = 0;
    
    // 内容长度分数（500-2000字最佳）
    if (article.length >= 500 && article.length <= 2000) {
      score += 50;
    } else if (article.length > 2000 && article.length <= 3000) {
      score += 30;
    } else if (article.length > 3000) {
      score += 10;
    }
    
    // 关键词出现次数分数
    const keywordCount = (article.content.match(new RegExp(keyword, 'gi')) || []).length;
    score += Math.min(keywordCount * 5, 30);
    
    // 标题包含关键词加分
    if (article.title && article.title.includes(keyword)) {
      score += 20;
    }
    
    return {
      ...article,
      score
    };
  });
  
  // 按分数排序，返回最高分的文章
  scoredArticles.sort((a, b) => b.score - a.score);
  
  return scoredArticles[0];
}

module.exports = {
  searchAndFetchArticles,
  selectBestArticle,
  fetchArticleContent
};

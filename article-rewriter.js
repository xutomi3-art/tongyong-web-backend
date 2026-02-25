// 文章改写模块
const { OpenAI } = require('openai');

/**
 * 使用LLM改写文章
 * @param {string} originalArticle - 原始文章内容
 * @param {string} keyword - 关键词
 * @param {Object} llmConfig - LLM配置
 * @returns {Promise<Object>} 改写后的文章数据
 */
async function rewriteArticle(originalArticle, keyword, llmConfig) {
  try {
    if (!llmConfig || !llmConfig.apiKey) {
      throw new Error('LLM配置不完整');
    }

    const openai = new OpenAI({
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.apiEndpoint || 'https://api.openai.com/v1'
    });

    const prompt = `请将以下文章改写成一篇原创文章，要求：
1. 保持核心观点和信息
2. 使用不同的表达方式和句式结构
3. 确保语言流畅自然
4. 围绕关键词"${keyword}"展开
5. 文章长度保持在800-1500字
6. 避免AI痕迹，使用更人性化的表达

原文：
${originalArticle}

请直接输出改写后的文章内容，不要添加任何前缀或说明。`;

    const response = await openai.chat.completions.create({
      model: llmConfig.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的内容编辑，擅长改写文章并保持原创性。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 2000
    });

    const rewrittenContent = response.choices[0].message.content.trim();

    // 生成标题
    const titleResponse = await openai.chat.completions.create({
      model: llmConfig.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的标题撰写专家。' },
        { role: 'user', content: `请为以下文章生成一个吸引人的标题，要求简洁有力，包含关键词"${keyword}"：\n\n${rewrittenContent.substring(0, 500)}` }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    const title = titleResponse.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    return {
      title,
      content: rewrittenContent,
      keyword,
      source: 'rewritten'
    };

  } catch (error) {
    console.error('改写文章失败:', error.message);
    throw error;
  }
}

module.exports = {
  rewriteArticle
};

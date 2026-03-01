// 文章改写模块
const { OpenAI } = require('openai');

/**
 * 默认改写提示词（SEO 友好 + 阅读体验优化）
 * 支持占位符：{{keyword}} {{wordCount}} {{minWordCount}} {{content}}
 */
const DEFAULT_REWRITE_PROMPT = `你是一位专业的 SEO 内容写作专家，擅长将普通文章改写成高质量、对搜索引擎友好、读者喜爱的博客文章。

请将以下原文改写成一篇 SEO 友好的原创博客文章，严格遵守以下要求：

【内容要求】
1. 围绕核心关键词"{{keyword}}"展开，自然地将关键词融入标题、小标题和正文中
2. 保留原文的核心观点和有价值的信息，但用全新的表达方式重新组织
3. 文章长度必须达到 {{wordCount}} 字以上（不少于 {{minWordCount}} 字），内容要充实、有深度
4. 语言流畅自然，避免 AI 痕迹，使用更人性化、更有温度的表达
5. 在文章开头（引言部分）直接给出核心答案或关键结论，方便读者快速获取信息

【结构要求】
6. 文章必须包含以下结构：
   - 引言段落：用 1-2 段吸引读者，说明文章价值
   - 3-5 个主要章节，每个章节有清晰的标题
   - 每个章节下可以有 2-3 个子章节
   - 结尾总结段落：概括要点，给出行动建议
7. 每个段落控制在 2-4 句话，避免大段文字堆砌
8. 适当使用列表来呈现步骤、特点或对比信息

【格式要求】
9. 直接输出 HTML 格式，不要使用 Markdown 语法（禁止使用 ###、**、- 等 Markdown 符号）
10. 使用以下 HTML 标签：
    - <h2> 用于主要章节标题（字体较大，醒目）
    - <h3> 用于子章节标题
    - <p> 用于正文段落
    - <strong> 用于加粗重要关键词和核心概念（每个段落加粗 1-2 处）
    - <ul> 和 <li> 用于无序列表
    - <ol> 和 <li> 用于有序步骤列表
11. 不要输出任何前缀说明、\`\`\`html 代码块标记，直接输出 HTML 内容
12. 不要包含 <html>、<head>、<body> 等完整页面标签，只输出文章正文 HTML

原文内容：
{{content}}`;

/**
 * 将 Markdown 格式转换为 HTML
 */
function markdownToHtml(text) {
  if (!text) return '';
  // 如果已经包含 HTML 标签，直接返回
  if (text.includes('<p>') || text.includes('<h2>') || text.includes('<h3>')) {
    return text;
  }
  let html = text;
  // 处理标题 ### ## #
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // 处理粗体 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 处理斜体 *text*
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 处理无序列表
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // 处理段落（双换行分隔）
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
    block = block.trim();
    if (!block) return '';
    // 已经是 HTML 标签的不再包裹
    if (block.startsWith('<h') || block.startsWith('<ul') || block.startsWith('<li')) {
      return block;
    }
    // 单换行转 <br>
    block = block.replace(/\n/g, '<br>');
    return `<p>${block}</p>`;
  }).join('\n');
  return html;
}

/**
 * 使用LLM改写文章
 * @param {string} originalArticle - 原始文章内容
 * @param {string} keyword - 关键词
 * @param {Object} llmConfig - LLM配置
 * @param {number} rewriteRounds - 改写轮数（默认3轮）
 * @param {number} wordCount - 目标字数（默认1000）
 * @param {string|null} customPrompt - 自定义改写提示词（可选，含占位符 {{keyword}} {{wordCount}} {{minWordCount}} {{content}}）
 * @returns {Promise<Object>} 改写后的文章数据
 */
async function rewriteArticle(originalArticle, keyword, llmConfig, rewriteRounds = 3, wordCount = 1000, customPrompt = null) {
  try {
    if (!llmConfig || !llmConfig.apiKey) {
      throw new Error('LLM配置不完整');
    }

    const openai = new OpenAI({
      apiKey: llmConfig.apiKey,
      baseURL: llmConfig.apiEndpoint || 'https://api.openai.com/v1'
    });

    // 使用自定义提示词或默认提示词，替换占位符
    const promptTemplate = (customPrompt && customPrompt.trim()) ? customPrompt : DEFAULT_REWRITE_PROMPT;
    const prompt = promptTemplate
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{wordCount\}\}/g, wordCount)
      .replace(/\{\{minWordCount\}\}/g, Math.floor(wordCount * 0.9))
      .replace(/\{\{content\}\}/g, originalArticle);

    const systemMessage = '你是一位专业的 SEO 内容写作专家，擅长改写文章并保持原创性。输出格式必须是 HTML，使用 <h2>、<h3>、<p>、<strong>、<ul>、<li> 等标签，不使用 Markdown。';

    let rewrittenContent = '';

    // 多轮改写
    for (let round = 1; round <= rewriteRounds; round++) {
      const messages = round === 1
        ? [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ]
        : [
            { role: 'system', content: systemMessage },
            { role: 'user', content: `请对以下文章进行第${round}轮深度改写，进一步提高原创性和可读性，同时确保 SEO 友好（关键词"${keyword}"自然融入标题和正文），输出为 HTML 格式（使用 <h2>、<h3>、<p>、<strong>、<ul>、<li> 等标签）：\n\n${rewrittenContent}` }
          ];

      const response = await openai.chat.completions.create({
        model: llmConfig.model || 'gpt-3.5-turbo',
        messages,
        temperature: 0.8,
        max_tokens: Math.max(4000, wordCount * 2)
      });

      rewrittenContent = response.choices[0].message.content.trim();
      // 去除可能的 ```html ... ``` 包裹
      rewrittenContent = rewrittenContent.replace(/^```html\s*/i, '').replace(/\s*```$/, '').trim();
      console.log(`[改写] 第${round}轮完成，内容长度: ${rewrittenContent.length}`);
    }

    // 兜底：如果 LLM 仍然返回了 Markdown，转换为 HTML
    if (!rewrittenContent.includes('<p>') && !rewrittenContent.includes('<h2>')) {
      console.log('[改写] 检测到 Markdown 格式，自动转换为 HTML');
      rewrittenContent = markdownToHtml(rewrittenContent);
    }

    // 生成标题
    const plainText = rewrittenContent.replace(/<[^>]+>/g, '').substring(0, 500);
    const titleResponse = await openai.chat.completions.create({
      model: llmConfig.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的标题撰写专家。只输出标题文字，不要加引号、序号或任何其他内容。' },
        { role: 'user', content: `请为以下文章生成一个吸引人的 SEO 标题，要求简洁有力，自然包含关键词"${keyword}"，适合作为博客文章标题：\n\n${plainText}` }
      ],
      temperature: 0.7,
      max_tokens: 50
    });

    const title = titleResponse.choices[0].message.content.trim().replace(/^["'「『]|["'」』]$/g, '');

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
  rewriteArticle,
  markdownToHtml,
  DEFAULT_REWRITE_PROMPT
};

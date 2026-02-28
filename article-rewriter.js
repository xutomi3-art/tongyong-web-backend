// 文章改写模块
const { OpenAI } = require('openai');

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
 * @returns {Promise<Object>} 改写后的文章数据
 */
async function rewriteArticle(originalArticle, keyword, llmConfig, rewriteRounds = 3) {
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
5. 文章长度必须达到${wordCount}字以上（不少于${Math.floor(wordCount * 0.9)}字），内容要充实详细
6. 避免AI痕迹，使用更人性化的表达
7. 直接输出 HTML 格式内容，使用 <h2>、<h3>、<p>、<strong>、<ul>、<li> 等标签，不要使用 Markdown 语法（不要用 ###、**、- 等）
8. 不要输出任何前缀、说明或 \`\`\`html 代码块标记，直接输出 HTML 内容

原文：
${originalArticle}`;

    let rewrittenContent = '';

    // 多轮改写
    for (let round = 1; round <= rewriteRounds; round++) {
      const messages = round === 1
        ? [
            { role: 'system', content: '你是一位专业的内容编辑，擅长改写文章并保持原创性。输出格式必须是 HTML，使用 <h2>、<p>、<strong> 等标签，不使用 Markdown。' },
            { role: 'user', content: prompt }
          ]
        : [
            { role: 'system', content: '你是一位专业的内容编辑，擅长改写文章并保持原创性。输出格式必须是 HTML，使用 <h2>、<p>、<strong> 等标签，不使用 Markdown。' },
            { role: 'user', content: `请对以下文章进行第${round}轮深度改写，进一步提高原创性和可读性，确保输出为 HTML 格式（使用 <h2>、<p>、<strong> 等标签）：\n\n${rewrittenContent}` }
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
        { role: 'user', content: `请为以下文章生成一个吸引人的标题，要求简洁有力，包含关键词"${keyword}"：\n\n${plainText}` }
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
  markdownToHtml
};

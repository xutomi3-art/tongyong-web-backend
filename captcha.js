// 验证码生成模块

/**
 * 生成随机验证码文本
 * @param {number} length - 验证码长度，默认4位
 * @returns {string} 验证码文本
 */
function generateCaptchaText(length = 4) {
  const chars = '0123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成验证码SVG图片
 * @param {string} text - 验证码文本
 * @returns {string} SVG字符串
 */
function generateCaptchaSVG(text) {
  const width = 120;
  const height = 40;
  const fontSize = 24;
  
  // 随机背景色
  const bgColor = `rgb(${Math.floor(Math.random() * 50 + 200)}, ${Math.floor(Math.random() * 50 + 200)}, ${Math.floor(Math.random() * 50 + 200)})`;
  
  // 生成干扰线
  let lines = '';
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }
  
  // 生成文字
  let textElements = '';
  const spacing = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const x = spacing * (i + 1);
    const y = height / 2 + fontSize / 3;
    const rotate = Math.random() * 30 - 15; // -15 到 15 度旋转
    const color = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;
    textElements += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" transform="rotate(${rotate} ${x} ${y})" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">${text[i]}</text>`;
  }
  
  // 组合SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}"/>
    ${lines}
    ${textElements}
  </svg>`;
  
  return svg;
}

module.exports = {
  generateCaptchaText,
  generateCaptchaSVG
};

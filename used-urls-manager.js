/**
 * URL去重管理模块
 * 用于记录和管理已使用的文章URL，避免重复改写相同的文章
 */

const fs = require('fs').promises;
const path = require('path');

const USED_URLS_FILE = path.join(__dirname, 'data', 'used-urls.json');

/**
 * 确保数据文件存在
 */
async function ensureDataFile() {
  try {
    await fs.access(USED_URLS_FILE);
  } catch (error) {
    // 文件不存在，创建空数组
    await fs.writeFile(USED_URLS_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * 获取所有已使用的URL
 * @returns {Promise<Array<{url: string, keyword: string, usedAt: string}>>}
 */
async function getUsedUrls() {
  await ensureDataFile();
  try {
    const data = await fs.readFile(USED_URLS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取已使用URL失败:', error);
    return [];
  }
}

/**
 * 添加已使用的URL
 * @param {string} url - 文章URL
 * @param {string} keyword - 关键词
 */
async function addUsedUrl(url, keyword) {
  const usedUrls = await getUsedUrls();
  
  // 检查是否已存在
  if (usedUrls.some(item => item.url === url)) {
    return;
  }
  
  usedUrls.push({
    url,
    keyword,
    usedAt: new Date().toISOString()
  });
  
  await fs.writeFile(USED_URLS_FILE, JSON.stringify(usedUrls, null, 2));
  console.log(`✓ 已记录URL: ${url}`);
}

/**
 * 检查URL是否已使用
 * @param {string} url - 文章URL
 * @returns {Promise<boolean>}
 */
async function isUrlUsed(url) {
  const usedUrls = await getUsedUrls();
  return usedUrls.some(item => item.url === url);
}

/**
 * 过滤掉已使用的URL
 * @param {Array<string>} urls - URL列表
 * @returns {Promise<Array<string>>} 未使用的URL列表
 */
async function filterUnusedUrls(urls) {
  const usedUrls = await getUsedUrls();
  const usedUrlSet = new Set(usedUrls.map(item => item.url));
  
  const unusedUrls = urls.filter(url => !usedUrlSet.has(url));
  
  console.log(`URL过滤: 总数 ${urls.length}, 已使用 ${urls.length - unusedUrls.length}, 可用 ${unusedUrls.length}`);
  
  return unusedUrls;
}

/**
 * 获取已使用URL的数量
 * @returns {Promise<number>}
 */
async function getUsedUrlCount() {
  const usedUrls = await getUsedUrls();
  return usedUrls.length;
}

/**
 * 清空所有已使用的URL
 */
async function clearUsedUrls() {
  await fs.writeFile(USED_URLS_FILE, JSON.stringify([], null, 2));
  console.log('✓ 已清空所有已使用的URL');
}

/**
 * 获取指定关键词的已使用URL数量
 * @param {string} keyword - 关键词
 * @returns {Promise<number>}
 */
async function getUsedUrlCountByKeyword(keyword) {
  const usedUrls = await getUsedUrls();
  return usedUrls.filter(item => item.keyword === keyword).length;
}

/**
 * 删除过期的URL记录（超过指定天数）
 * @param {number} days - 天数
 */
async function removeExpiredUrls(days = 90) {
  const usedUrls = await getUsedUrls();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - days);
  
  const validUrls = usedUrls.filter(item => {
    const usedDate = new Date(item.usedAt);
    return usedDate > expiryDate;
  });
  
  if (validUrls.length < usedUrls.length) {
    await fs.writeFile(USED_URLS_FILE, JSON.stringify(validUrls, null, 2));
    console.log(`✓ 已删除 ${usedUrls.length - validUrls.length} 条过期URL记录`);
  }
}

module.exports = {
  getUsedUrls,
  addUsedUrl,
  isUrlUsed,
  filterUnusedUrls,
  getUsedUrlCount,
  clearUsedUrls,
  getUsedUrlCountByKeyword,
  removeExpiredUrls
};

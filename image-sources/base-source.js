const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 图片源基类
 * 所有具体的图片源都继承自这个类
 */
class BaseSource {
  constructor(name, baseDir = '/var/www/shanyue/dist/images/articles') {
    this.name = name;
    this.baseDir = baseDir;
    this.sourceDir = path.join(baseDir, name.toLowerCase());
    this.ensureDir();
  }

  /**
   * 确保目录存在
   */
  ensureDir() {
    if (!fs.existsSync(this.sourceDir)) {
      fs.mkdirSync(this.sourceDir, { recursive: true });
      console.log(`创建目录: ${this.sourceDir}`);
    }
  }

  /**
   * 获取图片（子类必须实现）
   * @param {string} keyword - 搜索关键词
   * @param {Set} usedImages - 已使用的图片集合
   * @returns {Promise<Object>} - 图片信息对象
   */
  async fetchImage(keyword, usedImages) {
    throw new Error(`${this.name}: fetchImage() 方法必须被子类实现`);
  }

  /**
   * 下载图片到本地
   * @param {string} url - 图片URL
   * @param {string} imageId - 图片ID
   * @returns {Promise<string>} - 本地文件路径
   */
  async downloadImage(url, imageId) {
    try {
      const filename = `${imageId}.jpg`;
      const localPath = path.join(this.sourceDir, filename);

      // 如果文件已存在，直接返回
      if (fs.existsSync(localPath)) {
        console.log(`  图片已存在: ${filename}`);
        return localPath;
      }

      console.log(`  下载图片: ${filename}`);
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      fs.writeFileSync(localPath, response.data);
      console.log(`  ✓ 保存成功: ${localPath}`);

      return localPath;
    } catch (error) {
      console.error(`  ✗ 下载失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查图片是否已使用
   * @param {string} imageId - 图片ID
   * @param {Set} usedImages - 已使用的图片集合
   * @returns {boolean}
   */
  isUsed(imageId, usedImages) {
    const fullId = `${this.name}:${imageId}`;
    return usedImages.has(fullId);
  }

  /**
   * 生成完整的图片ID
   * @param {string} imageId - 原始图片ID
   * @returns {string}
   */
  getFullId(imageId) {
    return `${this.name}:${imageId}`;
  }

  /**
   * 将本地路径转换为Web路径
   * @param {string} localPath - 本地文件路径
   * @returns {string}
   */
  toWebPath(localPath) {
    return localPath.replace('/var/www/shanyue/dist', '');
  }

  /**
   * 生成图片哈希值（用于去重）
   * @param {string} url - 图片URL
   * @returns {string}
   */
  generateHash(url) {
    return crypto.createHash('md5').update(url).digest('hex').substring(0, 16);
  }

  /**
   * 翻译中文关键词为英文
   * @param {string} keyword - 中文关键词
   * @returns {string}
   */
  translateKeyword(keyword) {
    const mapping = {
      'AI阅卷': 'AI grading education technology',
      '智能批改': 'intelligent correction teaching',
      '自动阅卷系统': 'automatic grading system',
      '教育AI': 'education AI technology',
      '智能教育': 'smart education classroom',
      '作业批改': 'homework correction teacher',
      '试卷分析': 'exam analysis assessment',
      '教学评估': 'teaching evaluation assessment',
      '学情分析': 'learning analytics data',
      '个性化教学': 'personalized teaching learning'
    };

    return mapping[keyword] || `${keyword} education technology`;
  }
}

module.exports = { BaseSource };

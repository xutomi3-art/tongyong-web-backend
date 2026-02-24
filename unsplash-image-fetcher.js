const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Unsplash 图片获取器
 * 负责从 Unsplash 获取唯一的、未使用过的图片
 */
class UnsplashImageFetcher {
  constructor(accessKey = null) {
    this.accessKey = accessKey || process.env.UNSPLASH_ACCESS_KEY;
    this.usedIdsFile = '/var/www/shanyue/data/used-unsplash-ids.json';
    this.imageDir = '/var/www/shanyue/dist/images/articles/unsplash';
    this.usedIds = new Set();
    this.loadUsedIds();
    this.ensureImageDir();
  }

  /**
   * 确保图片目录存在
   */
  ensureImageDir() {
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
      console.log(`创建图片目录: ${this.imageDir}`);
    }
  }

  /**
   * 加载已使用的图片ID
   */
  loadUsedIds() {
    try {
      if (fs.existsSync(this.usedIdsFile)) {
        const data = JSON.parse(fs.readFileSync(this.usedIdsFile, 'utf8'));
        this.usedIds = new Set(data.usedIds || []);
        console.log(`加载已使用图片ID: ${this.usedIds.size} 个`);
      } else {
        this.usedIds = new Set();
        this.saveUsedIds();
      }
    } catch (error) {
      console.error('加载已使用图片ID失败:', error.message);
      this.usedIds = new Set();
    }
  }

  /**
   * 保存已使用的图片ID
   */
  saveUsedIds() {
    try {
      const dir = path.dirname(this.usedIdsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        usedIds: Array.from(this.usedIds),
        lastUpdated: new Date().toISOString(),
        count: this.usedIds.size
      };
      
      fs.writeFileSync(this.usedIdsFile, JSON.stringify(data, null, 2));
      console.log(`保存已使用图片ID: ${this.usedIds.size} 个`);
    } catch (error) {
      console.error('保存已使用图片ID失败:', error.message);
    }
  }

  /**
   * 搜索图片（使用 Unsplash API）
   */
  async searchImages(keyword, count = 30) {
    if (!this.accessKey) {
      throw new Error('未配置 Unsplash Access Key');
    }

    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: `${keyword} education technology`,
          per_page: count,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': `Client-ID ${this.accessKey}`
        },
        timeout: 10000
      });

      if (response.data && response.data.results) {
        console.log(`搜索到 ${response.data.results.length} 张图片`);
        return response.data.results;
      }

      return [];
    } catch (error) {
      console.error('Unsplash API 搜索失败:', error.message);
      throw error;
    }
  }

  /**
   * 使用 Unsplash Source（简单方式，无需 API Key）
   */
  async getRandomImageFromSource(keyword) {
    try {
      // 使用 Unsplash Source 获取随机图片
      const url = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(keyword)},education,technology`;
      
      // 获取重定向后的实际图片URL
      const response = await axios.get(url, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200,
        timeout: 10000
      });

      let imageUrl;
      if (response.status === 302 && response.headers.location) {
        imageUrl = response.headers.location;
      } else if (response.status === 200) {
        imageUrl = response.request.res.responseUrl || url;
      } else {
        throw new Error('无法获取图片URL');
      }

      // 从URL中提取图片ID
      const match = imageUrl.match(/\/photo-(\w+)-/);
      const imageId = match ? match[1] : crypto.randomBytes(8).toString('hex');

      return {
        id: imageId,
        url: imageUrl,
        source: 'unsplash-source'
      };
    } catch (error) {
      console.error('Unsplash Source 获取失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取唯一图片（未使用过的）
   */
  async getUniqueImage(keyword) {
    console.log(`\n获取唯一图片: ${keyword}`);
    
    try {
      let images = [];
      
      // 优先使用 API（如果配置了 Access Key）
      if (this.accessKey) {
        try {
          images = await this.searchImages(keyword, 30);
        } catch (error) {
          console.log('API 搜索失败，回退到 Source 方式');
        }
      }

      // 如果 API 失败或未配置，使用 Source 方式
      if (images.length === 0) {
        // 尝试多次获取不同的随机图片
        for (let i = 0; i < 10; i++) {
          const image = await this.getRandomImageFromSource(keyword);
          if (!this.usedIds.has(image.id)) {
            images.push({
              id: image.id,
              urls: { regular: image.url }
            });
            break;
          }
          console.log(`图片 ${image.id} 已使用，重试...`);
        }
      }

      if (images.length === 0) {
        throw new Error('未找到可用图片');
      }

      // 从未使用过的图片中随机选择一张
      const availableImages = images.filter(img => !this.usedIds.has(img.id));
      
      if (availableImages.length === 0) {
        console.log('所有图片都已使用，清空记录重新开始');
        this.usedIds.clear();
        this.saveUsedIds();
        return await this.getUniqueImage(keyword);
      }

      const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      console.log(`选择图片: ${selectedImage.id}`);

      // 下载图片到本地
      const localPath = await this.downloadImage(selectedImage);

      // 标记为已使用
      this.markAsUsed(selectedImage.id);

      return {
        id: selectedImage.id,
        localPath: localPath,
        webPath: localPath.replace('/var/www/shanyue/dist', ''),
        source: 'unsplash'
      };
    } catch (error) {
      console.error('获取唯一图片失败:', error.message);
      throw error;
    }
  }

  /**
   * 下载图片到本地
   */
  async downloadImage(image) {
    try {
      const imageUrl = image.urls.regular || image.urls.full;
      const filename = `${image.id}.jpg`;
      const localPath = path.join(this.imageDir, filename);

      // 如果文件已存在，直接返回
      if (fs.existsSync(localPath)) {
        console.log(`图片已存在: ${filename}`);
        return localPath;
      }

      console.log(`下载图片: ${filename}`);
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      fs.writeFileSync(localPath, response.data);
      console.log(`图片保存成功: ${localPath}`);

      return localPath;
    } catch (error) {
      console.error('下载图片失败:', error.message);
      throw error;
    }
  }

  /**
   * 标记图片为已使用
   */
  markAsUsed(imageId) {
    this.usedIds.add(imageId);
    this.saveUsedIds();
    console.log(`标记图片为已使用: ${imageId} (总计: ${this.usedIds.size})`);
  }

  /**
   * 清空已使用记录
   */
  clearUsedIds() {
    this.usedIds.clear();
    this.saveUsedIds();
    console.log('已清空所有已使用图片记录');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      usedCount: this.usedIds.size,
      usedIds: Array.from(this.usedIds),
      lastUpdated: fs.existsSync(this.usedIdsFile) 
        ? fs.statSync(this.usedIdsFile).mtime 
        : null
    };
  }
}

module.exports = { UnsplashImageFetcher };

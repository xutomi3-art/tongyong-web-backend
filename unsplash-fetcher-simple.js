const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Unsplash图片获取器（简化版，只使用官方API）
 */
class UnsplashFetcher {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.dataDir = path.join(__dirname, 'data');
    this.imageDir = path.join(__dirname, 'public', 'images', 'articles', 'unsplash');
    this.usedImagesFile = path.join(this.dataDir, 'used-unsplash-images.json');
    
    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.imageDir)) {
      fs.mkdirSync(this.imageDir, { recursive: true });
    }
    
    // 加载已使用的图片记录
    this.usedImages = this.loadUsedImages();
    
    console.log(`[Unsplash] 初始化完成，已使用图片数量: ${this.usedImages.size}`);
  }

  /**
   * 加载已使用的图片记录
   */
  loadUsedImages() {
    try {
      if (fs.existsSync(this.usedImagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
        return new Set(data.usedImages || []);
      }
    } catch (error) {
      console.log(`[Unsplash] 加载记录失败: ${error.message}`);
    }
    return new Set();
  }

  /**
   * 保存已使用的图片记录
   */
  saveUsedImages(imageId) {
    try {
      let data = { usedImages: [], lastUpdated: null };
      if (fs.existsSync(this.usedImagesFile)) {
        data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
      }
      
      if (!data.usedImages.includes(imageId)) {
        data.usedImages.push(imageId);
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(this.usedImagesFile, JSON.stringify(data, null, 2));
        this.usedImages.add(imageId);
        console.log(`[Unsplash] 保存图片记录: ${imageId}`);
      }
    } catch (error) {
      console.error(`[Unsplash] 保存记录失败: ${error.message}`);
    }
  }

  /**
   * 翻译中文关键词为英文
   */
  translateKeyword(keyword) {
    const translations = {
      'AI阅卷': 'AI grading education technology',
      '智能批改': 'intelligent correction teaching',
      '自动阅卷系统': 'automatic grading system',
      '教育AI': 'education AI technology',
      '智能教育': 'smart education',
      '作业批改': 'homework correction',
      '试卷分析': 'exam analysis',
      '教学评估': 'teaching assessment',
      '学情分析': 'student performance analysis',
      '个性化教学': 'personalized teaching'
    };
    
    return translations[keyword] || keyword;
  }

  /**
   * 使用官方API搜索图片
   */
  async searchImages(keyword) {
    if (!this.apiKey) {
      throw new Error('未配置Unsplash API Key');
    }
    
    const englishKeyword = this.translateKeyword(keyword);
    console.log(`[Unsplash] 搜索图片: ${keyword} (${englishKeyword})`);
    
    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: englishKeyword,
          per_page: 30,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': `Client-ID ${this.apiKey}`
        },
        timeout: 10000
      });
      
      if (response.data && response.data.results && response.data.results.length > 0) {
        console.log(`[Unsplash] 找到 ${response.data.results.length} 张图片`);
        return response.data.results;
      } else {
        throw new Error('未找到图片');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        throw new Error('API Key无效或已过期');
      }
      throw new Error(`API请求失败: ${error.message}`);
    }
  }

  /**
   * 下载图片到本地
   */
  async downloadImage(url, imageId) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000
      });
      
      const filename = `${imageId}.jpg`;
      const localPath = path.join(this.imageDir, filename);
      
      fs.writeFileSync(localPath, response.data);
      console.log(`[Unsplash] 图片已下载: ${filename}`);
      
      return localPath;
    } catch (error) {
      throw new Error(`下载图片失败: ${error.message}`);
    }
  }

  /**
   * 获取唯一图片
   */
  async getUniqueImage(keyword) {
    console.log(`\n[Unsplash] ========== 获取唯一图片 ==========`);
    console.log(`[Unsplash] 关键词: ${keyword}`);
    console.log(`[Unsplash] 已使用图片数量: ${this.usedImages.size}`);
    
    // 搜索图片
    const images = await this.searchImages(keyword);
    
    // 过滤已使用的图片
    const availableImages = images.filter(img => !this.usedImages.has(img.id));
    
    if (availableImages.length === 0) {
      throw new Error('所有图片都已使用');
    }
    
    // 随机选择一张
    const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    console.log(`[Unsplash] 选择图片: ${selectedImage.id}`);
    console.log(`[Unsplash] 作者: ${selectedImage.user.name}`);
    
    // 下载图片
    const downloadUrl = selectedImage.urls.regular;
    const localPath = await this.downloadImage(downloadUrl, selectedImage.id);
    
    // 保存记录
    this.saveUsedImages(selectedImage.id);
    
    // 触发下载统计（Unsplash要求）
    if (selectedImage.links && selectedImage.links.download_location) {
      try {
        await axios.get(selectedImage.links.download_location, {
          headers: {
            'Authorization': `Client-ID ${this.apiKey}`
          }
        });
      } catch (error) {
        console.log(`[Unsplash] 下载统计失败（不影响使用）: ${error.message}`);
      }
    }
    
    const webPath = `/images/articles/unsplash/${selectedImage.id}.jpg`;
    
    console.log(`[Unsplash] ✓ 成功获取图片: ${webPath}`);
    
    // 添加UTM参数（Unsplash要求）
    const authorUrl = `${selectedImage.user.links.html}?utm_source=shanyue_ai&utm_medium=referral`;
    
    return {
      id: selectedImage.id,
      source: 'unsplash',
      url: downloadUrl,
      localPath: localPath,
      webPath: webPath,
      keyword: keyword,
      author: selectedImage.user.name,
      authorUrl: authorUrl,
      unsplashUrl: 'https://unsplash.com/?utm_source=shanyue_ai&utm_medium=referral'
    };
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalUsed: this.usedImages.size,
      source: 'unsplash'
    };
  }

  /**
   * 清空已使用的图片记录
   */
  clearUsedImages() {
    try {
      if (fs.existsSync(this.usedImagesFile)) {
        fs.unlinkSync(this.usedImagesFile);
        this.usedImages.clear();
        console.log('[Unsplash] ✓ 已清空图片使用记录');
        return true;
      }
    } catch (error) {
      console.error(`[Unsplash] 清空记录失败: ${error.message}`);
      return false;
    }
  }
  // Static helpers for admin endpoints
  static getUsedImageCount() {
    const filePath = path.join(__dirname, 'data', 'used-unsplash-images.json');
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return Array.isArray(data) ? data.length : Object.keys(data).length;
      }
    } catch (e) { /* ignore */ }
    return 0;
  }

  static clearUsedImages() {
    const filePath = path.join(__dirname, 'data', 'used-unsplash-images.json');
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) { /* ignore */ }
  }
}

module.exports = { UnsplashFetcher };

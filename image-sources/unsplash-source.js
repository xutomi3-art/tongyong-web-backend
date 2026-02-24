const axios = require('axios');
const { BaseSource } = require('./base-source');

/**
 * Unsplash 图片源
 * 支持两种方式：
 * 1. Unsplash Source（无需API Key，但功能有限）
 * 2. Unsplash API（需要API Key，功能完整）
 */
class UnsplashSource extends BaseSource {
  constructor(apiKey = null) {
    super('unsplash');
    this.apiKey = apiKey || process.env.UNSPLASH_ACCESS_KEY;
  }

  /**
   * 获取图片
   */
  async fetchImage(keyword, usedImages) {
    console.log(`\n[Unsplash] 搜索图片: ${keyword}`);

    // 如果配置了API Key，使用官方API
    if (this.apiKey) {
      return await this.fetchFromAPI(keyword, usedImages);
    }

    // 否则使用 Source 方式
    return await this.fetchFromSource(keyword, usedImages);
  }

  /**
   * 使用 Unsplash API 获取图片
   */
  async fetchFromAPI(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      
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

      if (!response.data || !response.data.results || response.data.results.length === 0) {
        throw new Error('未找到图片');
      }

      console.log(`  找到 ${response.data.results.length} 张图片`);

      // 过滤已使用的图片
      const availableImages = response.data.results.filter(img => 
        !this.isUsed(img.id, usedImages)
      );

      if (availableImages.length === 0) {
        throw new Error('所有图片都已使用');
      }

      // 随机选择一张
      const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      console.log(`  选择图片: ${selectedImage.id}`);

      // 下载图片
      const imageUrl = selectedImage.urls.regular || selectedImage.urls.full;
      const localPath = await this.downloadImage(imageUrl, selectedImage.id);

      return {
        id: selectedImage.id,
        fullId: this.getFullId(selectedImage.id),
        source: this.name,
        url: imageUrl,
        localPath: localPath,
        webPath: this.toWebPath(localPath),
        keyword: keyword
      };
    } catch (error) {
      console.log(`  ✗ API方式失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 使用 Unsplash Source 获取图片（无需API Key）
   */
  async fetchFromSource(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      
      // 尝试多次获取不同的随机图片
      for (let attempt = 0; attempt < 10; attempt++) {
        const url = `https://source.unsplash.com/1920x1080/?${encodeURIComponent(englishKeyword)}&sig=${Date.now()}`;
        
        console.log(`  尝试 ${attempt + 1}/10: 获取随机图片`);
        
        try {
          // 获取重定向后的实际图片URL
          const response = await axios.get(url, {
            maxRedirects: 5,
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });

          // 从最终URL中提取图片ID
          const finalUrl = response.request.res.responseUrl || url;
          const match = finalUrl.match(/\/photo-(\w+)-/) || finalUrl.match(/\/photos\/(\w+)/);
          const imageId = match ? match[1] : this.generateHash(finalUrl);

          // 检查是否已使用
          if (this.isUsed(imageId, usedImages)) {
            console.log(`  图片 ${imageId} 已使用，重试...`);
            continue;
          }

          console.log(`  ✓ 找到未使用的图片: ${imageId}`);

          // 下载图片
          const localPath = await this.downloadImage(finalUrl, imageId);

          return {
            id: imageId,
            fullId: this.getFullId(imageId),
            source: this.name,
            url: finalUrl,
            localPath: localPath,
            webPath: this.toWebPath(localPath),
            keyword: keyword
          };
        } catch (error) {
          console.log(`  尝试 ${attempt + 1} 失败: ${error.message}`);
          if (attempt < 9) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      throw new Error('多次尝试后仍未找到可用图片');
    } catch (error) {
      console.log(`  ✗ Source方式失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { UnsplashSource };

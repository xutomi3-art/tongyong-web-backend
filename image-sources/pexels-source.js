const axios = require('axios');
const cheerio = require('cheerio');
const { BaseSource } = require('./base-source');

/**
 * Pexels 图片源
 * 支持两种方式：
 * 1. Pexels API（需要API Key，推荐）
 * 2. 爬虫方式（无需API Key，备用）
 */
class PexelsSource extends BaseSource {
  constructor(apiKey = null) {
    super('pexels');
    this.apiKey = apiKey || process.env.PEXELS_API_KEY;
  }

  /**
   * 获取图片
   */
  async fetchImage(keyword, usedImages) {
    console.log(`\n[Pexels] 搜索图片: ${keyword}`);

    // 如果配置了API Key，使用官方API
    if (this.apiKey) {
      return await this.fetchFromAPI(keyword, usedImages);
    }

    // 否则使用爬虫方式
    return await this.fetchFromWeb(keyword, usedImages);
  }

  /**
   * 使用 Pexels API 获取图片
   */
  async fetchFromAPI(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      
      const response = await axios.get('https://api.pexels.com/v1/search', {
        params: {
          query: englishKeyword,
          per_page: 30,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': this.apiKey
        },
        timeout: 10000
      });

      if (!response.data || !response.data.photos || response.data.photos.length === 0) {
        throw new Error('未找到图片');
      }

      console.log(`  找到 ${response.data.photos.length} 张图片`);

      // 过滤已使用的图片
      const availableImages = response.data.photos.filter(img => 
        !this.isUsed(img.id.toString(), usedImages)
      );

      if (availableImages.length === 0) {
        throw new Error('所有图片都已使用');
      }

      // 随机选择一张
      const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      console.log(`  选择图片: ${selectedImage.id}`);

      // 下载图片
      const imageUrl = selectedImage.src.large || selectedImage.src.original;
      const localPath = await this.downloadImage(imageUrl, selectedImage.id.toString());

      return {
        id: selectedImage.id.toString(),
        fullId: this.getFullId(selectedImage.id.toString()),
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
   * 使用爬虫方式获取图片（无需API Key）
   */
  async fetchFromWeb(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      const searchUrl = `https://www.pexels.com/search/${encodeURIComponent(englishKeyword)}/`;
      
      console.log(`  爬取搜索页面: ${searchUrl}`);
      
      const response = await axios.get(searchUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const images = [];

      // 提取图片信息
      $('article.Photo').each((i, elem) => {
        const $elem = $(elem);
        const imageUrl = $elem.find('img').attr('src') || $elem.find('img').attr('data-src');
        const photoId = $elem.attr('data-photo-id') || this.generateHash(imageUrl);
        
        if (imageUrl && photoId) {
          // 转换为大图URL
          const largeUrl = imageUrl.replace(/\?.*$/, '?auto=compress&cs=tinysrgb&w=1920');
          images.push({
            id: photoId,
            url: largeUrl
          });
        }
      });

      if (images.length === 0) {
        throw new Error('未找到图片');
      }

      console.log(`  找到 ${images.length} 张图片`);

      // 过滤已使用的图片
      const availableImages = images.filter(img => 
        !this.isUsed(img.id, usedImages)
      );

      if (availableImages.length === 0) {
        throw new Error('所有图片都已使用');
      }

      // 随机选择一张
      const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      console.log(`  选择图片: ${selectedImage.id}`);

      // 下载图片
      const localPath = await this.downloadImage(selectedImage.url, selectedImage.id);

      return {
        id: selectedImage.id,
        fullId: this.getFullId(selectedImage.id),
        source: this.name,
        url: selectedImage.url,
        localPath: localPath,
        webPath: this.toWebPath(localPath),
        keyword: keyword
      };
    } catch (error) {
      console.log(`  ✗ 爬虫方式失败: ${error.message}`);
      throw error;
    }
  }
}

module.exports = { PexelsSource };

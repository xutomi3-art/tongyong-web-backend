const axios = require('axios');
const cheerio = require('cheerio');
const { BaseSource } = require('./base-source');

/**
 * Pixabay 图片源
 * 支持两种方式：
 * 1. Pixabay API（需要API Key，推荐）
 * 2. 爬虫方式（无需API Key，备用）
 */
class PixabaySource extends BaseSource {
  constructor(apiKey = null) {
    super('pixabay');
    this.apiKey = apiKey || process.env.PIXABAY_API_KEY;
  }

  /**
   * 获取图片
   */
  async fetchImage(keyword, usedImages) {
    console.log(`\n[Pixabay] 搜索图片: ${keyword}`);

    // 如果配置了API Key，使用官方API
    if (this.apiKey) {
      return await this.fetchFromAPI(keyword, usedImages);
    }

    // 否则使用爬虫方式
    return await this.fetchFromWeb(keyword, usedImages);
  }

  /**
   * 使用 Pixabay API 获取图片
   */
  async fetchFromAPI(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      
      const response = await axios.get('https://pixabay.com/api/', {
        params: {
          key: this.apiKey,
          q: englishKeyword,
          image_type: 'photo',
          orientation: 'horizontal',
          per_page: 30
        },
        timeout: 10000
      });

      if (!response.data || !response.data.hits || response.data.hits.length === 0) {
        throw new Error('未找到图片');
      }

      console.log(`  找到 ${response.data.hits.length} 张图片`);

      // 过滤已使用的图片
      const availableImages = response.data.hits.filter(img => 
        !this.isUsed(img.id.toString(), usedImages)
      );

      if (availableImages.length === 0) {
        throw new Error('所有图片都已使用');
      }

      // 随机选择一张
      const selectedImage = availableImages[Math.floor(Math.random() * availableImages.length)];
      console.log(`  选择图片: ${selectedImage.id}`);

      // 下载图片
      const imageUrl = selectedImage.largeImageURL || selectedImage.webformatURL;
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
      const searchUrl = `https://pixabay.com/images/search/${encodeURIComponent(englishKeyword)}/`;
      
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
      $('div.item a.link').each((i, elem) => {
        const $elem = $(elem);
        const href = $elem.attr('href');
        
        if (href) {
          // 从href中提取图片ID
          const match = href.match(/\/(\d+)\//);
          if (match) {
            const imageId = match[1];
            const $img = $elem.find('img');
            let imageUrl = $img.attr('data-lazy') || $img.attr('src');
            
            if (imageUrl) {
              // 转换为大图URL
              imageUrl = imageUrl.replace(/_\d+\./, '_1280.');
              images.push({
                id: imageId,
                url: imageUrl
              });
            }
          }
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

module.exports = { PixabaySource };

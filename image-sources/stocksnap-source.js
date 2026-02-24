const axios = require('axios');
const cheerio = require('cheerio');
const { BaseSource } = require('./base-source');

/**
 * StockSnap.io 图片源
 * 使用爬虫方式（StockSnap 没有公开API）
 */
class StockSnapSource extends BaseSource {
  constructor() {
    super('stocksnap');
  }

  /**
   * 获取图片
   */
  async fetchImage(keyword, usedImages) {
    console.log(`\n[StockSnap] 搜索图片: ${keyword}`);
    return await this.fetchFromWeb(keyword, usedImages);
  }

  /**
   * 使用爬虫方式获取图片
   */
  async fetchFromWeb(keyword, usedImages) {
    try {
      const englishKeyword = this.translateKeyword(keyword);
      const searchUrl = `https://stocksnap.io/search/${encodeURIComponent(englishKeyword)}`;
      
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
      $('.photo-item').each((i, elem) => {
        const $elem = $(elem);
        const $link = $elem.find('a.photo-link');
        const href = $link.attr('href');
        
        if (href) {
          // 从href中提取图片ID
          const match = href.match(/\/photo\/([^\/]+)/);
          if (match) {
            const imageId = match[1];
            const $img = $elem.find('img.photo-image');
            const imageUrl = $img.attr('data-src') || $img.attr('src');
            
            if (imageUrl) {
              // 转换为大图URL
              const largeUrl = imageUrl.replace(/\/thumb\//, '/img-thumb/').replace(/\?.*$/, '');
              images.push({
                id: imageId,
                url: largeUrl
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

module.exports = { StockSnapSource };

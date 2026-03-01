const fs = require('fs');
const path = require('path');
const { UnsplashSource } = require('./unsplash-source');
const { PexelsSource } = require('./pexels-source');
const { PixabaySource } = require('./pixabay-source');
const { StockSnapSource } = require('./stocksnap-source');

/**
 * 多源图片获取器
 * 按优先级依次尝试多个免费图片源，确保每张图片都不重复
 */
class MultiSourceFetcher {
  constructor(config = {}) {
    this.config = config;
    this.dataDir = config.dataDir || path.join(__dirname, '..', 'data');
    this.usedImagesFile = path.join(this.dataDir, 'used-images.json');
    
    // 初始化图片源（按优先级排序）
    this.sources = [
      new UnsplashSource(config.unsplashApiKey),
      new PexelsSource(config.pexelsApiKey),
      new PixabaySource(config.pixabayApiKey),
      new StockSnapSource()
    ];
    
    // 加载已使用的图片记录
    this.usedImages = this.loadUsedImages();
    
    console.log(`\n========== 多源图片获取器已初始化 ==========`);
    console.log(`已使用图片数量: ${this.usedImages.size}`);
    console.log(`图片源数量: ${this.sources.length}`);
    console.log(`优先级顺序: ${this.sources.map(s => s.name).join(' → ')}`);
  }

  /**
   * 加载已使用的图片记录
   */
  loadUsedImages() {
    try {
      if (fs.existsSync(this.usedImagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
        return new Set(Object.keys(data.usedImages || {}));
      }
    } catch (error) {
      console.log(`加载已使用图片记录失败: ${error.message}`);
    }
    return new Set();
  }

  /**
   * 保存已使用的图片记录
   */
  saveUsedImages(imageInfo) {
    try {
      // 确保目录存在
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // 读取现有数据
      let data = { usedImages: {}, stats: {} };
      if (fs.existsSync(this.usedImagesFile)) {
        data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
      }

      // 添加新记录
      data.usedImages[imageInfo.fullId] = {
        source: imageInfo.source,
        imageId: imageInfo.id,
        url: imageInfo.url,
        localPath: imageInfo.localPath,
        webPath: imageInfo.webPath,
        keyword: imageInfo.keyword,
        usedAt: new Date().toISOString()
      };

      // 更新统计
      if (!data.stats) data.stats = {};
      data.stats[imageInfo.source] = (data.stats[imageInfo.source] || 0) + 1;
      data.lastUpdated = new Date().toISOString();

      // 保存到文件
      fs.writeFileSync(this.usedImagesFile, JSON.stringify(data, null, 2));
      
      // 更新内存中的集合
      this.usedImages.add(imageInfo.fullId);
      
      console.log(`✓ 保存图片记录: ${imageInfo.fullId}`);
    } catch (error) {
      console.error(`保存图片记录失败: ${error.message}`);
    }
  }

  /**
   * 获取唯一图片
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<Object>} - 图片信息对象
   */
  async getUniqueImage(keyword) {
    console.log(`\n========== 获取唯一图片: ${keyword} ==========`);
    console.log(`当前已使用图片数量: ${this.usedImages.size}`);

    // 依次尝试每个图片源
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i];
      console.log(`\n[${i + 1}/${this.sources.length}] 尝试图片源: ${source.name}`);
      
      try {
        const imageInfo = await source.fetchImage(keyword, this.usedImages);
        
        if (imageInfo) {
          console.log(`\n✓ 成功获取图片!`);
          console.log(`  来源: ${imageInfo.source}`);
          console.log(`  ID: ${imageInfo.id}`);
          console.log(`  Web路径: ${imageInfo.webPath}`);
          
          // 保存记录
          this.saveUsedImages(imageInfo);
          
          return imageInfo;
        }
      } catch (error) {
        console.log(`✗ ${source.name} 失败: ${error.message}`);
        // 继续尝试下一个源
      }
    }

    // 所有源都失败
    console.log(`\n✗ 所有图片源都失败`);
    throw new Error('无法从任何图片源获取图片');
  }

  /**
   * 获取统计信息
   */
  getStats() {
    try {
      if (fs.existsSync(this.usedImagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
        return {
          totalUsed: Object.keys(data.usedImages || {}).length,
          stats: data.stats || {},
          lastUpdated: data.lastUpdated
        };
      }
    } catch (error) {
      console.error(`获取统计信息失败: ${error.message}`);
    }
    return {
      totalUsed: 0,
      stats: {},
      lastUpdated: null
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
        console.log('✓ 已清空图片使用记录');
        return true;
      }
    } catch (error) {
      console.error(`清空记录失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取已使用的图片列表
   */
  getUsedImagesList() {
    try {
      if (fs.existsSync(this.usedImagesFile)) {
        const data = JSON.parse(fs.readFileSync(this.usedImagesFile, 'utf8'));
        return Object.values(data.usedImages || {});
      }
    } catch (error) {
      console.error(`获取图片列表失败: ${error.message}`);
    }
    return [];
  }
}

module.exports = { MultiSourceFetcher };

const ImageStreamService = require('../services/ImageStreamService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const AbstractStreamHandler = require('./AbstractStreamHandler');

class ImageStreamHandler extends AbstractStreamHandler {

  /**
   * @override 估计令牌使用量
   * @returns {number} 令牌使用量
   */
  async estimateTokenUsage() {
    // 由于已在路由层验证，这里可以简化
    const { message } = this.req.body;
    const images = this.req.files || [];
    
    const baseTokens = TokenManager.estimateTokens(message);
    const imageTokens = images.length * 150;
    
    return baseTokens + imageTokens;
  }

  async validateInput() {
    const { message, sessionId } = this.req.body;
    const files = this.req.files;
    
    // 1. 基础验证
    if (!message || !sessionId || !files || files.length === 0) {
      throw new Error('缺少必要参数: message, sessionId, 或 images');
    }
    
    // 2. 数量限制
    if (files.length > 2) {
      throw new Error('最多支持上传2张图片');
    }
    
    // 3. 文件格式验证
    for (const file of files) {
      if (!file.path) {
        throw new Error('文件数据无效');
      }
      ChatValidation.validateImageMessage(message, file.originalname);
    }
    
    // 4. 设置处理后的图片数据
    this.req.body.images = files.map(file => ({
      path: file.path,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));
  }

  async getStreamData() {
    const { message, sessionId, images = [] } = this.req.body;

    await this.sendProcessing(`正在分析${images.length}张图片中...`);

    const stream = ImageStreamService.processImageStream({
      message, // 原始用户消息
      sessionId,
      images,
      user: this.user
    });

    return { stream };
  }

}

module.exports = ImageStreamHandler;
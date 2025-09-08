const ImageStreamService = require('../services/ImageStreamService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const AbstractStreamHandler = require('./AbstractStreamHandler');

class ImageStreamHandler extends AbstractStreamHandler {

  getMessageType() {
    return 'image';
  }

  async estimateTokenUsage() {
    const { message } = this.req.body;
    // 图片处理需要额外的token消耗
    return TokenManager.estimateTokens(message) + 150;
  }

  async validateInput() {
    const { message, sessionId } = this.req.body;
    const image = this.req.file; // 单个文件上传
    
    // 验证输入
    if (!message || !sessionId || !image) {
      throw new Error('缺少必要参数: message, sessionId, 或 image');
    }
    
    // 使用ChatValidation进行更详细的验证
    ChatValidation.validateImageMessage(message, image.rosUrl || image.path);
    
    // 将文件信息转换为images数组格式，保持与getStreamData的兼容性
    this.req.body.images = [{
      url: image.rosUrl || image.path,
      key: image.rosKey,
      location: image.location,
      originalname: image.originalname,
      mimetype: image.mimetype,
      size: image.size
    }];
  }

  async getStreamData() {
    const { message, sessionId, images } = this.req.body;

    // 发送处理开始状态
    await this.sendProcessing('正在分析图片并生成回复...');

    // 修复参数传递 - 传递第一张图片的信息
    const firstImage = images[0];
    const stream = ImageStreamService.processImageStream({
      message,
      sessionId,
      imageUrl: firstImage.url,           // ✅ 传递imageUrl
      rosKey: firstImage.key,             // ✅ 传递rosKey
      user: this.user
    });
  
    return { stream };
  }
}

module.exports = ImageStreamHandler;
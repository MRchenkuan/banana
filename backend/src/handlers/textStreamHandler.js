const TextStreamService = require('../services/TextStreamService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const BizStreamHandler = require('./bizStreamHandler');

class TextStreamHandler extends BizStreamHandler {

  getMessageType() {
    return 'text';
  }

  async estimateTokenUsage() {
    const { message } = this.req.body;
    return TokenManager.estimateTokens(message);
  }

  async validateInput() {
    const { message, sessionId } = this.req.body;
    
    // 验证输入
    if (!message || !sessionId) {
      throw new Error('缺少必要参数');
    }
    
    // 使用ChatValidation进行更详细的验证
    ChatValidation.validateTextMessage(message);
  }

  // 移除 sendStatusMessage，统一使用父类方法
  async getStreamData() {
    const { message, sessionId } = this.req.body;
    
    // 统一使用父类的 sendProcessing 方法
    await this.sendProcessing('正在生成回复...');
    
    // 获取流数据（不再需要传递user，因为余额已在handler层检查）
    const stream = TextStreamService.processTextStream({
      message,
      sessionId,
      user: this.user // 仍然传递user对象，但service不再做余额检测
    });
    
    // 返回包含stream的结果
    return { stream };
  }
}

module.exports = TextStreamHandler;
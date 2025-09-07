const BaseStreamHandler = require('./baseStreamHandler');
const TextStreamService = require('../services/TextStreamService');
const ChatValidation = require('../utils/chatValidation');

class TextStreamHandler extends BaseStreamHandler {

  getMessageType() {
    return 'text';
  }

  async preProcess() {
    const { message, sessionId } = this.req.body;
    
    // 验证输入
    if (!message || !sessionId) {
      throw new Error('缺少必要参数');
    }
  }

  async getStreamData() {
    const { message, sessionId } = this.req.body;

    // 发送处理开始状态
    await this.sendStatusMessage('processing', '正在生成回复...');

    // 获取流数据
    const stream = TextStreamService.processTextStream({
      message,
      sessionId,
      user: this.user
    });
    
    // 返回包含stream的结果
    return { stream };
  }

  async sendStatusMessage(type, message) {
    if (this.streamManager.isConnected()) {
      this.res.write(`data: ${JSON.stringify({
        type,
        message
      })}\n\n`);
    }
  }

}

module.exports = TextStreamHandler;
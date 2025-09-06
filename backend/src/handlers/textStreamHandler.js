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

  async processBusinessLogic() {
    const { message, sessionId } = this.req.body;

    // 发送处理开始状态
    await this.sendStatusMessage('processing', '正在生成回复...');

    // 使用生成器模式处理流式结果
    const stream = TextStreamService.processTextStream({
      message,
      sessionId,
      user: this.user
    });
    
    let fullResponse = '';  // 累积完整响应
    let totalTokensUsed = 0;  // 累积token使用量
    
    // 遍历生成器，发送每个chunk并累积数据
    for await (const chunk of stream) {
      if (!this.streamManager.isConnected()) {
        break;
      }
      
      await this.sendChunk(chunk);
      
      // 累积响应内容
      if (chunk.content || chunk.text) {
        const content = chunk.content || chunk.text;
        fullResponse += content;
        this.partialResponse += content;
      }
      
      // 累积token使用量
      if (chunk.tokens || chunk.estimatedTokens) {
        totalTokensUsed += (chunk.tokens || chunk.estimatedTokens);
      }
    }
    
    // 更新实例属性，供handleStreamComplete使用
    this.fullResponse = fullResponse;
    this.tokensUsed = totalTokensUsed;
    
    return { success: true, fullResponse, totalTokensUsed };
  }

  async sendStatusMessage(type, message) {
    if (this.streamManager.isConnected()) {
      this.res.write(`data: ${JSON.stringify({
        type,
        message
      })}\n\n`);
    }
  }

  async handleError(error) {
    const errorMessage = error.message || '聊天服务暂时不可用';
    
    // 发送错误响应
    if (this.streamManager && this.streamManager.isConnected()) {
      this.res.write(`data: ${JSON.stringify({
        type: 'error',
        message: errorMessage
      })}\n\n`);
    }
    
    console.error('TextStreamHandler错误:', error);
  }
}

module.exports = TextStreamHandler;
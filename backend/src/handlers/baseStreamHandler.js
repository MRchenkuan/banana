
/**
 * 流式处理基础处理器
 * 提供流式聊天处理的通用框架，使用模板方法模式
 * 子类需要实现getStreamData()和preProcess()方法
 */
class BaseStreamHandler {
  /**
   * 构造函数
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.chatMessage = null;
    this.streamManager = null;
    this.chatManager = null;
    this.partialResponse = '';
    this.tokensUsed = 0;
    this.fullResponse = '';
    this.messageSender = new MessageSender(res);
  }

  /**
   * 发送流式数据块到前端
   * 将数据块格式化为前端期望的格式并发送
   * @async
   * @param {Object} chunk - 数据块对象
   * @param {string} [chunk.content] - 数据块内容
   * @param {string} [chunk.text] - 数据块文本（向后兼容）
   * @param {number} [chunk.tokens] - token使用量
   * @param {number} [chunk.estimatedTokens] - 估计token使用量（向后兼容）
   */
  async sendChunk(chunk) {
    this._sendData({
      type: 'text',
      content: chunk.content || chunk.text,
      tokens: chunk.tokens || chunk.estimatedTokens || 0,
    });
  }

  /**
   * 发送会话标题更新消息
   * @async
   * @param {string} title - 新的会话标题
   */
  async sendTitle(title){
    this._sendData({
      type: 'set-session-title',
      title: title
    });
  }

  /**
   * 发送处理状态消息
   * @async
   * @param {string} message - 处理状态描述
   */
  async sendProcessing(message){
    this._sendData({
      type: 'processing',
      message,
    });
  }

  /**
   * 发送错误消息到前端
   * @async
   * @param {Object} errorInfo - 错误信息对象
   * @param {string} errorInfo.message - 错误消息
   * @param {number} errorInfo.code - 错误代码
   */
  async sendError({message, code}){
    this._sendData({
      type: 'error',
      message,
      code
    });
  }

  
  // 同时修改 sendComplete 和 sendError
  async sendComplete(data = {}) {
    if (!this.streamManager.isConnected()) {
      return;
    }
    
    // 内部获取最新的用户余额
    const currentBalance = this.user ? this.user.tokenBalance : null;
    
    const completeData = {
      ...data,
      type: 'complete',
      tokensUsed: this.tokensUsed,
      remainingBalance: currentBalance,
    };
    
    try {
      // 对于重要的complete消息，使用回调确保发送
      return new Promise((resolve) => {
        this.res.write(`data: ${JSON.stringify(completeData)}\n\n`, () => {
          this.res.end();
          resolve();
        });
      });
    } catch (error) {
      console.error('发送完成消息失败:', error);
      this.res.end();
    }
  }

  /**
   * 处理流式响应完成后的操作
   * 保存完成的数据、发送完成消息、更新数据库状态
   * @async
   */
  async handleStreamComplete() {
    const result = await this.chatManager.saveCompletedData(
      this.fullResponse,
      this.tokensUsed
    );
    
    this.sendComplete({
      tokensUsed: this.tokensUsed,
      remainingBalance: result.remainingBalance,
    })
  }

  /**
   * 通用错误处理
   * 发送错误响应到前端并记录错误日志
   * @async
   * @param {Error} error - 错误对象
   * @param {string} [error.message] - 错误消息
   * @param {number} [error.code] - 错误代码
   */
  async handleError(error) {    
    // 业务层处理错误
    if (this.chatManager) {
      await this.chatManager.handleError(error, this.partialResponse);
    }
    
    // 流层发送错误响应
    this.sendError({
        message: error.message || '服务暂时不可用',
        code: error.code || -1
    })
  }

  /**
   * 清理资源
   * 清理流管理器、更新错误状态、关闭响应连接
   * @async
   * @param {Error} [error=null] - 可选的错误对象，如果提供则更新聊天记录为错误状态
   */
  // 修改 cleanup 方法
  async cleanup(error = null) {
    // 1. 处理业务层清理
    if (this.chatManager) {
      if (error) {
        await this.chatManager.handleError(error);
      } else {
        await this.chatManager.handleInterruption();
      }
    }
    
    // 2. 处理流层清理
    if (this.streamManager) {
      this.streamManager.cleanup();
    }
  }

  /**
   * 内部方法 - 发送SSE数据
   * 检查连接状态并发送格式化的SSE数据
   * @async
   * @param {Object} data - 要发送的数据对象
   * @private
   */
  async _sendData(data) {
    if (this.streamManager) {
      return this.streamManager.sendData(data);
    }
    return false;
  }
}

module.exports = BaseStreamHandler;

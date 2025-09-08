const StreamManager = require('../utils/streamManager')

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
    
    // 1. 创建流管理器
    this.streamManager = new StreamManager();
    this.streamManager.setupSSEHeaders(this.res);
  }

  async sendMessagge(data){
    this._sendSSE({
      ...data,
      type: 'message',
    });
  }

  /**
   * 发送会话标题更新消息
   * @async
   * @param {string} title - 新的会话标题
   */
  async sendTitle(title){
    this._sendSSE({
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
    this._sendSSE({
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
    this._sendSSE({
      type: 'error',
      message,
      code
    });
  }

  
  // 同时修改 sendComplete 和 sendError
  // 修改sendComplete方法，接受tokensUsed作为参数
  // 第73行 - sendComplete方法
  async sendComplete(data = {}) {
    if (!this.streamManager || !this.streamManager.isConnected()) {
      return;
    }
    const completeData = {
      ...data,
      type: 'complete',
    };
    
    try {
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
   * 内部方法 - 发送SSE数据
   * 检查连接状态并发送格式化的SSE数据
   * @async
   * @param {Object} data - 要发送的数据对象
   * @private
   */
  // 第103行 - _sendSSE方法
  async _sendSSE(data) {
    if (this.streamManager) {
      return this.streamManager.sendData(data);
    }
    return false;
  }
}

module.exports = BaseStreamHandler;

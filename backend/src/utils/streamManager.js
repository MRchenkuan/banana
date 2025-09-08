const TokenManager = require('./tokenManager');
const { STREAM_STATUS } = require('../constants/streamStatus');

class StreamManager {
  constructor() {
    this.isInitialized = false;
    this.res = null;
  }
  
  setupSSEHeaders(res) {
    this.res = res;
    this.res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    this.isInitialized = true;
  }
  
  isConnected() {
    return this.isInitialized && this.res && !this.res.destroyed;
  }

  /**
   * 发送SSE数据
   */
  sendData(data) {
    if (!this.isConnected()) {
      return false;
    }
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
    return true;
  }

  /**
   * 关闭连接
   */
  close() {
    if (this.isConnected()) {
      this.res.end();
    }
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.res = null;
    this.isInitialized = false;
  }
}

module.exports = StreamManager;
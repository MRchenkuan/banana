import StreamRequestHandler from './core/StreamRequestHandler';

class ChatService {
  constructor(httpClient, baseURL) {
    this.httpClient = httpClient;
    this.streamHandler = new StreamRequestHandler(baseURL);
  }

  async getChatHistory(page = 1, limit = 20) {
    return this.httpClient.get(`/chat/history?page=${page}&limit=${limit}`);
  }


  /**
   * 发送文本消息
   * @param {string} message - 消息内容
   * @param {string} sessionId - 会话ID
   * @param {object} context - 请求上下文
   * @returns {Promise} - 流响应
   */
  async sendTextMessage(message, sessionId, context) {
    return this.sendImageMessage(message, [], sessionId, context);

    // 纯文本消息 - 不大可能用
    // const requestData = { message, sessionId };
    // return this.streamHandler.sendStreamRequest(
    //   '/chat/text-stream',
    //   requestData,
    //   context
    // );
  }

  async sendImageMessage(message, imageFiles, sessionId, context) {
    const formData = new FormData();
    formData.append('message', message);
    
    // 支持多张图片
    if (Array.isArray(imageFiles)) {
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
    } else {
      formData.append('images', imageFiles);
    }
    
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }

    return this.streamHandler.sendStreamRequest(
      '/chat/image-stream',
      formData,
      context
    );
  }
}

export default ChatService;
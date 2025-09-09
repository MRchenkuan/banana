import StreamRequestHandler from './core/StreamRequestHandler';

class ChatService {
  constructor(httpClient, baseURL) {
    this.httpClient = httpClient;
    this.streamHandler = new StreamRequestHandler(baseURL);
  }

  async getChatHistory(page = 1, limit = 20) {
    return this.httpClient.get(`/chat/history?page=${page}&limit=${limit}`);
  }

  async sendTextMessage(message, sessionId, context) {
    const requestData = { message, sessionId };
    return this.streamHandler.sendStreamRequest(
      '/chat/text-stream',
      requestData,
      context
    );
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

    console.log('发送图片消息 - 请求数据:', {
      message: message ? '存在' : '缺失',
      imageFiles: Array.isArray(imageFiles) ? 
        imageFiles.map(file => ({
          name: file.name,
          type: file.type,
          size: file.size
        })) : 
        imageFiles ? {
          name: imageFiles.name,
          type: imageFiles.type,
          size: imageFiles.size
        } : '缺失',
      sessionId: sessionId ? '存在' : '缺失'
    });

    return this.streamHandler.sendStreamRequest(
      '/chat/image-stream',
      formData,
      context
    );
  }
}

export default ChatService;
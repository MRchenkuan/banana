class StreamResponseProcessor {
  constructor(handlerFactory) {
    this.handlerFactory = handlerFactory;
  }

  /**
   * 处理流式响应
   * @param {Response} response - fetch响应对象
   * @param {Object} callbacks - 回调函数集合
   * @param {string} sessionId - 会话ID
   * @param {string} messageId - 消息ID
   * @param {string} thinkingMessageId - 思考消息ID
   */
  async processStreamResponse(response, callbacks, sessionId, messageId, thinkingMessageId) {
    const {
      onChunk,
      onComplete,
      onError,
      onProcessing
    } = callbacks;

    try {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // 使用消息处理器工厂统一处理所有类型的消息
              this.handlerFactory.handleMessage(data.type, data, {
                messageId,
                thinkingMessageId,
                sessionId,
                onChunk,
                onComplete,
                onError,
                onProcessing
              });
              
            } catch (parseError) {
              console.error('解析SSE数据失败:', parseError, '原始数据:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('流式响应处理失败:', error);
      // 使用错误处理器统一处理错误
      this.handlerFactory.handleMessage('error', { error: error.message }, {
        thinkingMessageId,
        onError
      });
    }
  }

  /**
   * 处理网络响应错误
   * @param {Response} response - fetch响应对象
   * @returns {Promise<string>} 错误消息
   */
  async handleResponseError(response) {
    const errorText = await response.text();
    let errorMessage = '网络请求失败';
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = `HTTP error! status: ${response.status}`;
    }
    
    return errorMessage;
  }
}

export default StreamResponseProcessor;
import MessageHandlerFactory from './MessageHandlerFactory';

class StreamRequestHandler {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  /**
   * 发送流式请求
   * @param {string} endpoint - API端点
   * @param {Object} requestData - 请求数据
   * @param {Object} context - 处理上下文
   * @param {Object} options - 请求选项
   */
  async sendStreamRequest(endpoint, requestData, context, options = {}) {
    const {
      setMessages,
      updateBalance,
      setSessions,
      thinkingMessageId,
      messageId,
      sessionId,
      setLoading
    } = context;

    // 创建消息处理器工厂
    const handlerFactory = new MessageHandlerFactory({
      setMessages,
      updateBalance,
      setSessions,
      setLoading
    });

    try {
      const response = await this.makeRequest(endpoint, requestData, options);
      
      if (!response.ok) {
        const errorMessage = await this.handleResponseError(response);
        
        // 添加对402错误的特殊处理
        if (response.status === 402) {
          // 触发余额不足事件，通知应用打开支付弹窗
          const { EventBus } = await import('./HttpClient');
          EventBus.dispatch('INSUFFICIENT_BALANCE', {
            message: 'Token 余额不足，请充值后继续使用',
            balance: 0 // 可能需要从响应中获取实际余额
          });
          return;
        }
        
        throw new Error(errorMessage);
      }

      // 直接处理流式响应，无需额外的处理器
      await this.processStreamResponse(response, handlerFactory, {
        sessionId,
        messageId,
        thinkingMessageId,
        setLoading
      });
      
    } catch (error) {
      console.error(`流式请求失败 [${endpoint}]:`, error);
      handlerFactory.handleMessage('error', { error: error.message }, {
        thinkingMessageId
      });
      throw error;
    }
  }

  /**
   * 处理流式响应（原StreamResponseProcessor的核心功能）
   * @param {Response} response - fetch响应对象
   * @param {MessageHandlerFactory} handlerFactory - 消息处理器工厂
   * @param {Object} context - 处理上下文
   */
  async processStreamResponse(response, handlerFactory, context) {
    const { sessionId, messageId, thinkingMessageId, setLoading } = context;

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
              
              // 直接使用消息处理器工厂处理消息
              handlerFactory.handleMessage(data.type, data, {
                messageId,
                thinkingMessageId,
                sessionId,
                setLoading  // 添加这一行
              });
              
            } catch (parseError) {
              console.error('解析SSE数据失败:', parseError, '原始数据:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('流式响应处理失败:', error);
      handlerFactory.handleMessage('error', { error: error.message }, {
        thinkingMessageId
      });
    }
  }

  /**
   * 处理网络响应错误（原StreamResponseProcessor的功能）
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

  async makeRequest(endpoint, requestData, options) {
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };

    let body;
    if (requestData instanceof FormData) {
      body = requestData;
      delete headers['Content-Type'];
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(requestData);
    }

    return fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body,
      ...options
    });
  }
}

export default StreamRequestHandler;
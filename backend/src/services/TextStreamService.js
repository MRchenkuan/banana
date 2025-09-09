const GeminiTextService = require('./gemini/GeminiTextService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');

class TextStreamService {
  
  /**
   * 处理文本流式生成（生成器模式）
   * @param {Object} params - 参数对象
   * @param {string} params.message - 用户消息
   * @param {string} params.sessionId - 会话ID
   * @param {Object} params.user - 用户对象
   * @returns {AsyncGenerator} 流式结果生成器
   */
  async * processTextStream({ message, sessionId, user }) {
    // 1. 输入验证
    ChatValidation.validateTextMessage(message);
    
    // 2. Token预估和余额检查
    const estimatedTokens = TokenManager.estimateTokens(message);
    await TokenManager.checkBalance(user, estimatedTokens);
    
    try {
      // 3. 生成文本内容（直接yield）
      yield* this.generateTextContent(message, sessionId, user);
      
    } catch (error) {
      console.error('文本流处理服务错误:', error);
      throw error;
    }
  }

  /**
   * 生成文本内容（核心业务逻辑）
   */
  async * generateTextContent(message, sessionId, user) {
    // 调用AI服务生成内容
    const streamIterator = GeminiTextService.generateTextStream(message, sessionId);
    
    let totalTokensUsed = 0;
    let fullTextResponse = '';
    
    // 处理AI返回的流式结果
    for await (const chunk of streamIterator) {
      if (chunk.text) {
        const textContent = chunk.text;
        fullTextResponse += textContent;
        
        const estimatedTokens = TokenManager.estimateTokens(textContent);
        totalTokensUsed += estimatedTokens;
        
        yield {
          type: 'text',
          content: textContent,
          tokens: estimatedTokens,
          metadata: { 
            estimatedTokens,
            totalTokensUsed: totalTokensUsed,
            fullTextResponse: fullTextResponse
          }
        };
        
      }
    }
  }
}

module.exports = new TextStreamService();
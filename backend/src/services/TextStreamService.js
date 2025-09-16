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
    
    try {
      // 2. 生成文本内容（直接yield）
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
    const tokenProcessor = this._createTokenProcessor(message);
    let fullTextResponse = '';
    
    try {
      // 调用AI服务生成内容
      const streamIterator = GeminiTextService.generateTextStream(message, sessionId);
      
      // 处理AI返回的流式结果
      for await (const chunk of streamIterator) {
        // 更新实际token使用量
        tokenProcessor.updateActual(chunk.usageMetadata);
        
        // 处理文本内容
        const textResult = this._processTextChunk(chunk, tokenProcessor);
        if (textResult) {
          fullTextResponse += textResult.content;
          yield textResult;
        }
      }
      
    } catch (error) {
      console.error('文本生成错误:', error);
      throw error;
    } finally {
      // 在流结束时返回完整的usage数据
      yield {
        type: 'usage_final',
        content: fullTextResponse,
        tokenUsed: tokenProcessor.getFinalStats(),
      };
    }
  }

  /**
   * 处理文本chunk
   * @private
   */
  _processTextChunk(chunk, tokenProcessor) {
    if (chunk.text) {
      tokenProcessor.addOutputText(chunk.text);
      return {
        type: 'text',
        content: chunk.text,
        tokenUsed: tokenProcessor.getCurrentStats(),
      };
    }
    return null;
  }

  /**
   * Token统计处理器
   * @private
   */
  _createTokenProcessor(message) {
    const tokenStats = TokenManager.createStatsManager();

    const processor = {
      tokenStats,
      estimateInput() {
        // 预估输入文本token
        tokenStats.addEstimatedInputText(message);
      },
      updateActual(tokenUsed) {
        if (tokenUsed) {
          tokenStats.updateActualTokens(tokenUsed);
        }
      },
      addOutputText(text) {
        tokenStats.addEstimatedOutputText(text);
      },
      getCurrentStats() {
        return tokenStats.getCurrentStats();
      },
      getFinalStats() {
        return tokenStats.getCurrentStats();
      }
    };

    // 立即执行输入预估
    processor.estimateInput();
    
    return processor;
  }
}

module.exports = new TextStreamService();
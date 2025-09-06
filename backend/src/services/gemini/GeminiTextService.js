
const BaseGeminiService = require('./BaseGeminiService')

class GeminiTextService extends BaseGeminiService {
  /**
   * 生成流式文本（专注AI调用）
   * @param {string} prompt - 提示词
   * @param {string} session_id - 会话ID
   * @returns {AsyncGenerator} 流式响应
   */
  async *generateTextStream(prompt, session_id) {
    try {
      console.log('\n=== Gemini 流式文本生成 ===');
      console.log('输入:', prompt);
      console.log('使用模型:', this.config.textGeneration.model);
      
      const chatHistory = await this.getChatHistory(session_id);
      const response = await this.ai.chats.create({
        model: this.config.textGeneration.model,
        history: chatHistory,
        config: this.config.textGeneration.config
      }).sendMessageStream({
        message: prompt,
      });
      
      // 正确处理流式响应
      for await (const chunk of response) {
        yield chunk;
      }
      
      console.log('=== 流式文本生成完成 ===\n');
    } catch (error) {
      console.error('流式文本生成错误:', error);
      throw new Error(this.config.errorHandling.fallbackMessages.textGeneration);
    }
  }
}

module.exports = new GeminiTextService();
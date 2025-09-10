
const BaseGeminiService = require('./BaseGeminiService')

class GeminiTextService extends BaseGeminiService {
  /**
   * 生成流式文本（专注AI调用）
   * @param {string} prompt - 提示词
   * @param {string} session_id - 会话ID
   * @returns {AsyncGenerator} 流式响应
   */
  async * generateTextStream(prompt, session_id) {
    try {

      const model = 'gemini-2.5-flash';

      console.log('\n=== Gemini 流式文本生成 ===');
      console.log('输入:', prompt);
      console.log('使用模型:', model);
      
      const chatHistory = await this.getChatHistory(session_id, 3);
      yield* await this.ai.chats.create({
        model,
        history: chatHistory,
        config: {
          temperature: 1,
          thinkingConfig: {
            thinkingBudget: 0, // 禁用思考模式
          },
          topP: 0.95,
          systemInstruction:`！！！请务必注意：如果用户的意图是希望生成图片你生成图片，请提醒他传图片而不要告诉他无法生成。`,
          safetySettings: [
            {
              // 仇恨言论检测
              category: 'HARM_CATEGORY_HARASSMENT',
              // 阻止中等及以上风险的内容
              threshold: 'BLOCK_NONE'
            },
            {
              // 危险内容检测
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_NONE'
            },
            {
              // 骚扰内容检测
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_NONE'
            },
            {
              // 性暴露内容检测
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_NONE'
            },
            {
              // 性暴露内容检测
              category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
              threshold: 'BLOCK_NONE'
            }
          ],
        }
      }).sendMessageStream({
        message: `${prompt}`,
      });
      
      console.log('=== 流式文本生成完成 ===\n');
    } catch (error) {
      console.error('流式文本生成错误:', error);
      throw new Error('文本生成服务暂时不可用，请稍后重试');
    }
  }
}

module.exports = new GeminiTextService();
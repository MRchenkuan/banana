const GEMINI_CONFIG = require('../../config/geminiConfig');
const { GoogleGenAI } = require('@google/genai');
const ChatMessage = require('../../models/ChatMessage');

class BaseGeminiService {
  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.config = GEMINI_CONFIG;
  }


  // 根据 sessionId 获取聊天历史记录
  async getChatHistory(sessionId) {
    try {
      const limit = this.config.textGeneration.MaxChatHistoryLength;

      console.log(`获取会话 ${sessionId} 的聊天历史记录`);
      
      // 从数据库获取最近的聊天记录
      const messages = await ChatMessage.findAll({
        where: {
          sessionId: sessionId
        },
        order: [['createdAt', 'ASC']], // 按时间升序排列
        limit: limit * 2, // 获取更多记录以确保有足够的对话对
        attributes: ['userMessage', 'aiResponse', 'createdAt']
      });

      // 转换为 Gemini API 需要的格式
      const history = [];
      
      messages.forEach(message => {
        // 添加用户消息
        if (message.userMessage) {
          history.push({
            role: 'user',
            parts: [{ text: message.userMessage }]
          });
        }
        
        // 添加AI回复
        if (message.aiResponse) {
          history.push({
            role: 'model',
            parts: [{ text: message.aiResponse }]
          });
        }
      });

      // 限制历史记录长度，保持最近的对话
      const MaxChatHistoryLength = limit * 2; // 用户消息 + AI回复
      if (history.length > MaxChatHistoryLength) {
        history.splice(0, history.length - MaxChatHistoryLength);
      }

      console.log(`获取到 ${history.length} 条历史记录`);
      return history;
      
    } catch (error) {
      console.error('获取聊天历史记录失败:', error);
      // 如果获取历史记录失败，返回空数组，不影响正常对话
      return [];
    }
  }

  // 修复生成标题方法
  async generateTitle(conversationContext) {
    try {
      // 使用配置文件中的提示词模板
      const prompt = this.config.titleGeneration.promptTemplate
        .replace('{conversationContext}', conversationContext);
      
      console.log('\n=== 生成标题 ===');
      console.log('对话上下文长度:', conversationContext.length, '字符');
      
      const response = await this.ai.models.generateContent({
        model: this.config.titleGeneration.model,
        contents: prompt,
        config: this.config.titleGeneration.config
      });
      
      // 正确获取响应文本
      let title = '';
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const parts = response.candidates[0].content.parts;
        title = parts.map(part => part.text || '').join('').trim();
      } else if (response.text) {
        title = response.text.trim();
      }
      
      // 使用配置文件中的处理规则
      title = this._processTitle(title);
      
      console.log('生成的标题:', title);
      console.log('=== 标题生成完成 ===\n');
      
      return title || this.config.titleGeneration.processing.defaultTitle;
    } catch (error) {
      console.error('生成标题失败:', error);
      return this.config.titleGeneration.processing.defaultTitle;
    }
  }

  // 私有方法：处理标题格式
  _processTitle(title) {
    const processing = this.config.titleGeneration.processing;
    
    // 应用移除模式
    processing.removePatterns.forEach(pattern => {
      title = title.replace(pattern, '');
    });
    
    title = title.trim();
    
    // 限制长度
    if (title.length > processing.maxLength) {
      title = title.substring(0, processing.truncateLength) + '...';
    }
    
    return title;
  }
}

module.exports = BaseGeminiService;
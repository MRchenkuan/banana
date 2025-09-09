/**
 * 提示词管理工具
 * 提供提示词的获取、组合和管理功能
 */

const prompts = require('../config/prompts');

class PromptManager {
  /**
   * 获取系统提示词
   * @param {string} type - 提示词类型
   * @param {object} variables - 变量替换
   * @returns {string} 提示词内容
   */
  static getSystemPrompt(type = 'default', variables = {}) {
    return prompts.utils.getPrompt('system', type, variables);
  }

  /**
   * 获取用户交互提示词
   * @param {string} type - 提示词类型
   * @param {object} variables - 变量替换
   * @returns {string} 提示词内容
   */
  static getUserPrompt(type, variables = {}) {
    return prompts.utils.getPrompt('userInteraction', type, variables);
  }

  /**
   * 获取功能提示词
   * @param {string} type - 提示词类型
   * @param {object} variables - 变量替换
   * @returns {string} 提示词内容
   */
  static getFeaturePrompt(type, variables = {}) {
    return prompts.utils.getPrompt('features', type, variables);
  }

  /**
   * 获取图片相关提示词
   * @param {string} type - 提示词类型
   * @param {object} variables - 变量替换
   * @returns {string} 提示词内容
   */
  static getImagePrompt(type, variables = {}) {
    return prompts.utils.getPrompt('image', type, variables);
  }

  /**
   * 构建完整的对话提示词
   * @param {object} options - 配置选项
   * @returns {string} 完整提示词
   */
  static buildConversationPrompt(options = {}) {
    const {
      systemType = 'default',
      userMessage = '',
      context = '',
      imageAnalysis = false,
      variables = {}
    } = options;

    const parts = [];

    // 添加系统提示词
    parts.push(this.getSystemPrompt(systemType, variables));

    // 添加上下文
    if (context) {
      parts.push(`上下文信息：${context}`);
    }

    // 添加图片分析提示
    if (imageAnalysis) {
      parts.push(this.getImagePrompt('describe'));
    }

    // 添加用户消息
    if (userMessage) {
      parts.push(`用户问题：${userMessage}`);
    }

    return prompts.utils.combinePrompts(parts);
  }

  /**
   * 根据消息类型获取合适的提示词
   * @param {string} messageType - 消息类型
   * @param {string} content - 消息内容
   * @param {object} options - 额外选项
   * @returns {string} 提示词
   */
  static getPromptByMessageType(messageType, content, options = {}) {
    switch (messageType) {
      case 'code':
        return this.buildConversationPrompt({
          systemType: 'codeAssistant',
          userMessage: content,
          ...options
        });
      
      case 'image':
        return this.buildConversationPrompt({
          systemType: 'imageAnalysis',
          userMessage: content,
          imageAnalysis: true,
          ...options
        });
      
      case 'creative':
        return this.buildConversationPrompt({
          systemType: 'creativeWriting',
          userMessage: content,
          ...options
        });
      
      default:
        return this.buildConversationPrompt({
          userMessage: content,
          ...options
        });
    }
  }

  /**
   * 验证提示词长度
   * @param {string} prompt - 提示词
   * @param {number} maxLength - 最大长度
   * @returns {boolean} 是否有效
   */
  static validatePromptLength(prompt, maxLength = 4000) {
    return prompt.length <= maxLength;
  }

  /**
   * 截断过长的提示词
   * @param {string} prompt - 提示词
   * @param {number} maxLength - 最大长度
   * @returns {string} 截断后的提示词
   */
  static truncatePrompt(prompt, maxLength = 4000) {
    if (prompt.length <= maxLength) {
      return prompt;
    }
    
    return prompt.substring(0, maxLength - 3) + '...';
  }
}

module.exports = PromptManager;
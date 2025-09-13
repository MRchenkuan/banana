const { User, TokenUsage } = require('../models');

class TokenManager {
  static async getUserBalance(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return { user, balance: user.tokenBalance };
  }
  
  static estimateTokens(text) {
    return Math.ceil(text.length * 0.75);
  }
  
  static estimateTextTokens(text) {
    return Math.ceil(text.length * 0.75);
  }
  
  static async checkBalance(user, estimatedTokens) {
    // 移除余额检查，允许余额为负
    if (user.tokenBalance < estimatedTokens) {
      throw new Error('Token余额不足3');
    }
    return true;
  }
  
  static async deductTokens(user, tokensUsed) {
    return await user.deductTokens(tokensUsed);
  }
  
  static async recordTokenUsage({
    userId,
    chatMessageId,
    tokensUsed,
    operation,
    balanceBefore,
    balanceAfter
  }) {
    return await TokenUsage.create({
      userId,
      chatMessageId,
      tokensUsed,
      operation,
      balanceBefore,
      balanceAfter
    });
  }
  
  /**
   * 根据 Gemini 规则预估图像处理所需的 tokens
   * @param {Object} imageInfo - 图像信息对象
   * @param {number} imageInfo.width - 图像宽度（像素）
   * @param {number} imageInfo.height - 图像高度（像素）
   * @returns {number} 预估的 token 数量
   */
  static estimateImageTokens(imageInfo) {
    // 如果没有提供图像信息，返回默认值
    if (!imageInfo || !imageInfo.width || !imageInfo.height) {
      return 258; // Gemini 默认图像 token 数
    }
    
    const { width, height } = imageInfo;
    
    // 根据 Gemini 2.0 规则计算图像 token
    // 如果图像尺寸小于等于 384x384，消耗 258 tokens
    // 否则，按 768x768 的瓦片计算，每个瓦片 258 tokens
    if (width <= 384 && height <= 384) {
      return 258;
    } else {
      // 计算需要多少个 768x768 的瓦片
      const tilesWidth = Math.ceil(width / 768);
      const tilesHeight = Math.ceil(height / 768);
      return tilesWidth * tilesHeight * 258;
    }
  }
  
  /**
   * 根据 Gemini 规则预估视频处理所需的 tokens
   * @param {number} durationSeconds - 视频时长（秒）
   * @returns {number} 预估的 token 数量
   */
  static estimateVideoTokens(durationSeconds) {
    // Gemini 视频处理规则：每秒 263 tokens
    return Math.ceil(durationSeconds * 263);
  }
  
  /**
   * 根据 Gemini 规则预估音频处理所需的 tokens
   * @param {number} durationSeconds - 音频时长（秒）
   * @returns {number} 预估的 token 数量
   */
  static estimateAudioTokens(durationSeconds) {
    // Gemini 音频处理规则：每秒 32 tokens
    return Math.ceil(durationSeconds * 32);
  }
}

module.exports = TokenManager;
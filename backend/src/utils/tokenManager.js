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
}

module.exports = TokenManager;
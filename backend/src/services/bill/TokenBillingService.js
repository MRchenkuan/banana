const { User, TokenUsage, ChatMessage } = require('../../models');
const { sequelize } = require('../../config/database');

class TokenBillingService {
  /**
   * 处理消息token计费
   * @param {Object} params - 计费参数
   * @param {number} params.userId - 用户ID
   * @param {number} params.chatMessageId - 消息ID
   * @param {Object} params.usageMetadata - 真实的token使用数据
   * @param {string} params.userMessage - 用户消息（兜底用）
   * @param {string} params.aiResponse - AI响应（兜底用）
   * @returns {Promise<Object>} 计费结果
   */
  static async processMessageBilling(params) {
    const {
      userId,
      chatMessageId,
      usageMetadata,
      userMessage = '',
      aiResponse = ''
    } = params;

    const transaction = await sequelize.transaction();
    
    try {
      // 获取用户信息
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('用户不存在');
      }

      const balanceBefore = user.tokenBalance;
      
      // 提取真实token数据，提供兜底机制
      const tokenData = this._extractTokenData(usageMetadata, userMessage, aiResponse);
      
      // 检查余额
      if (balanceBefore < tokenData.totalTokens) {
        await transaction.rollback();
        return {
          success: false,
          error: 'insufficient_balance',
          message: 'Token余额不足',
          required: tokenData.totalTokens,
          available: balanceBefore
        };
      }

      // 扣除tokens
      const balanceAfter = balanceBefore - tokenData.totalTokens;
      await user.update({ tokenBalance: balanceAfter }, { transaction });

      // 更新ChatMessage
      await ChatMessage.update({
        tokensUsed: tokenData.totalTokens,
        inputTokens: tokenData.inputTokens,
        outputTokens: tokenData.outputTokens,
        tokenBalance: balanceBefore
      }, {
        where: { id: chatMessageId },
        transaction
      });

      // 记录token使用
      await TokenUsage.create({
        userId,
        chatMessageId,
        tokensUsed: tokenData.totalTokens,
        operation: 'chat',
        balanceBefore,
        balanceAfter,
        inputTokens: tokenData.inputTokens,
        outputTokens: tokenData.outputTokens,
        dataSource: tokenData.dataSource, // 'real' | 'estimated'
        usageMetadata: JSON.stringify(usageMetadata || {})
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        tokensUsed: tokenData.totalTokens,
        inputTokens: tokenData.inputTokens,
        outputTokens: tokenData.outputTokens,
        balanceBefore,
        balanceAfter,
        dataSource: tokenData.dataSource
      };
    } catch (error) {
      await transaction.rollback();
      console.error('Token计费错误:', error);
      throw error;
    }
  }

  /**
   * 提取token数据，提供兜底机制
   * @private
   */
  static _extractTokenData(usageMetadata, userMessage, aiResponse) {
    // 优先使用真实数据
    if (usageMetadata && usageMetadata.candidatesTokenCount && usageMetadata.promptTokenCount) {
      return {
        inputTokens: usageMetadata.promptTokenCount,
        outputTokens: usageMetadata.candidatesTokenCount,
        totalTokens: usageMetadata.totalTokenCount || 
                    (usageMetadata.promptTokenCount + usageMetadata.candidatesTokenCount),
        dataSource: 'real'
      };
    }
    
    // 兜底：使用估算
    console.warn('使用兜底token估算机制');
    const inputTokens = this._estimateTokens(userMessage);
    const outputTokens = this._estimateTokens(aiResponse);
    
    return {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      dataSource: 'estimated'
    };
  }

  /**
   * 估算token数量（兜底机制）
   * @private
   */
  static _estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length * 0.75);
  }

  /**
   * 预检查用户余额
   */
  static async checkUserBalance(userId, estimatedTokens) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    return {
      sufficient: user.tokenBalance >= estimatedTokens,
      balance: user.tokenBalance,
      required: estimatedTokens
    };
  }
}

module.exports = TokenBillingService;
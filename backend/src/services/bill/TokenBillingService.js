const { User, TokenUsage, ChatMessage } = require("../../models");
const { sequelize } = require("../../config/database");

class TokenBillingService {
  /**
   * 处理消息token计费
   * @param {Object} params - 计费参数
   * @param {number} params.userId - 用户ID
   * @param {number} params.chatMessageId - 消息ID
   * @param {Object} params.tokenUsed - 真实的token使用数据
   * @param {string} params.userMessage - 用户消息（兜底用）
   * @param {string} params.aiResponse - AI响应（兜底用）
   * @returns {Promise<Object>} 计费结果
   */
  static async processMessageBilling(params) {
    const {
      userId,
      chatMessageId,
      tokenUsed,
    } = params;

    // 第一阶段：优先确保token扣除
    const tokenTransaction = await sequelize.transaction();
    let balanceBefore, balanceAfter, tokenConsumed;
    
    try {
      // 获取用户信息并锁定行
      const user = await User.findByPk(userId, { 
        transaction: tokenTransaction,
        lock: true // 行级锁，防止并发问题
      });
      if (!user) {
        throw new Error("用户不存在");
      }

      balanceBefore = user.tokenBalance;
      tokenConsumed = tokenUsed.total;
      balanceAfter = balanceBefore - tokenConsumed;

      // 立即扣除token并提交
      await user.update({ tokenBalance: balanceAfter }, { transaction: tokenTransaction });
      await tokenTransaction.commit();
      
      console.log(`Token扣除成功: 用户${userId}, 消耗${tokenConsumed}, 余额${balanceAfter}`);
      
    } catch (error) {
      await tokenTransaction.rollback();
      console.error("Token扣除失败:", error);
      throw error;
    }

    // 第二阶段：更新其他相关记录（非关键操作）    
    // 更新ChatMessage
    await ChatMessage.update({
      tokensUsed: tokenConsumed,
      inputTokens: tokenUsed.input,
      outputTokens: tokenUsed.output,
      tokenBalance: balanceAfter,
    },{
        where: { id: chatMessageId },
    });

    // 记录token使用历史
    await TokenUsage.create({
      userId,
      chatMessageId,
      tokensUsed: tokenConsumed,
      operation: "chat",
      balanceBefore,
      balanceAfter,
      inputTokens: tokenUsed.input,
      outputTokens: tokenUsed.output,
    });

    return {
      success: true,
      tokensUsed: tokenConsumed,
      inputTokens: tokenUsed.input,
      outputTokens: tokenUsed.output,
      balanceBefore,
      balanceAfter,
    };
  }


  /**
   * 预检查用户余额
   */
  static async checkUserBalance(userId, estimatedTokens) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error("用户不存在");
    }

    return {
      sufficient: user.tokenBalance >= estimatedTokens,
      balance: user.tokenBalance,
      required: estimatedTokens,
    };
  }
}

module.exports = TokenBillingService;

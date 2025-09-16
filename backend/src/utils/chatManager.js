const { ChatMessage } = require('../models');
const TokenBillingService = require('../services/bill/TokenBillingService');
const { STREAM_STATUS } = require('../constants/streamStatus');

class ChatManager {
  constructor(user, userId, balanceBefore) {
    this.user = user;
    this.userId = userId;
    this.balanceBefore = balanceBefore;
    this.chatMessage = null;
  }

  /**
   * 创建聊天记录
   */
  async createChatMessage(messageData) {
    // 在创建消息前再次验证 sessionId
    const { Session } = require('../models');
    const session = await Session.findOne({
      where: {
        id: messageData.sessionId,
        userId: this.userId,
        isActive: true
      }
    });
    
    if (!session) {
      throw new Error('会话不存在，无法创建消息');
    }
    
    this.chatMessage = await ChatMessage.create({
      userId: this.userId,
      sessionId: messageData.sessionId,
      userMessage: messageData.message,
      aiResponse: '',
      tokensUsed: 0,
      streamStatus: STREAM_STATUS.PENDING,
    });
    return this.chatMessage;
  }

  /**
   * 更新流状态
   */
  async updateStreamStatus(status) {
    if (this.chatMessage) {
      await this.chatMessage.update({ streamStatus: status });
    }
  }

  /**
   * 保存完成的数据（使用新的计费服务）
   */
  async saveCompletedData(fullResponse, tokenUsed) {
    if (!this.chatMessage) {
      throw new Error('ChatMessage未初始化');
    }

    try {
      // 使用新的计费服务
      const billingResult = await TokenBillingService.processMessageBilling({
        userId: this.userId,
        chatMessageId: this.chatMessage.id,
        tokenUsed,
      });

      if (!billingResult.success) {
        throw new Error(billingResult.message);
      }

      // 更新聊天记录状态
      await this.chatMessage.update({
        aiResponse: fullResponse,
        streamStatus: STREAM_STATUS.COMPLETED,
      });

      // 更新用户对象的余额
      this.user.tokenBalance = billingResult.balanceAfter;

      console.log(`聊天完成 - 用户ID: ${this.userId}, 消耗Token: ${billingResult.tokensUsed} (输入:${billingResult.inputTokens}, 输出:${billingResult.outputTokens}), 数据源: ${billingResult.dataSource}, 剩余余额: ${billingResult.balanceAfter}`);

      return {
        success: true,
        tokensUsed: billingResult.tokensUsed,
        inputTokens: tokenUsed.input,
        outputTokens: tokenUsed.output,
        balanceBefore: billingResult.balanceBefore,
        balanceAfter: billingResult.balanceAfter,
      };
    } catch (error) {
      console.error('保存聊天数据失败:', error);
      
      // 保存失败时更新为错误状态
      if (this.chatMessage) {
        try {
          await this.chatMessage.update({
            streamStatus: STREAM_STATUS.ERROR,
            aiResponse: fullResponse || '保存失败'
          });
        } catch (updateError) {
          console.error('更新错误状态失败:', updateError);
        }
      }
      
      throw error;
    }
  }

  /**
   * 处理错误状态
   */
  async handleError(error) {
    if (this.chatMessage) {
      await this.chatMessage.update({
        streamStatus: STREAM_STATUS.ERROR,
        aiResponse: error.message || '处理失败'
      });
    }
  }

  /**
   * 清理时处理中断状态
   */
  async handleInterruption() {
    if (this.chatMessage) {
      const currentStatus = this.chatMessage.streamStatus;
      if (currentStatus === STREAM_STATUS.PENDING || currentStatus === STREAM_STATUS.STREAMING) {
        await this.chatMessage.update({
          streamStatus: STREAM_STATUS.INTERRUPTED
        });
        console.log('聊天记录状态已更新为中断');
      }
    }
  }

  /**
   * 获取聊天记录ID
   */
  getChatMessageId() {
    return this.chatMessage?.id;
  }
}

module.exports = ChatManager;
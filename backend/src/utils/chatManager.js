const { ChatMessage } = require('../models');
const TokenBillingService = require('../services/bill/TokenBillingService');
const { STREAM_STATUS } = require('../constants/streamStatus');

class ChatManager {
  constructor(user, userId, balanceBefore) {
    this.user = user;
    this.userId = userId;
    this.balanceBefore = balanceBefore;
    this.chatMessage = null;
    this.usageMetadata = null; // 保存真实的usage数据
  }

  /**
   * 创建聊天记录
   */
  async createChatMessage(messageData) {
    this.chatMessage = await ChatMessage.create({
      userId: this.userId,
      sessionId: messageData.sessionId,
      userMessage: messageData.message, // 这里的message已经包含了图片Markdown
      aiResponse: '',
      tokensUsed: 0,
      streamStatus: STREAM_STATUS.PENDING,
      partialResponse: ''
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
   * 设置真实的usage数据
   */
  setUsageMetadata(usageMetadata) {
    this.usageMetadata = usageMetadata;
  }

  /**
   * 保存完成的数据（使用新的计费服务）
   */
  async saveCompletedData(fullResponse, estimatedTokens, userMessage = '') {
    if (!this.chatMessage) {
      throw new Error('ChatMessage未初始化');
    }

    try {
      // 使用新的计费服务
      const billingResult = await TokenBillingService.processMessageBilling({
        userId: this.userId,
        chatMessageId: this.chatMessage.id,
        usageMetadata: this.usageMetadata,
        userMessage: userMessage,
        aiResponse: fullResponse
      });

      if (!billingResult.success) {
        throw new Error(billingResult.message);
      }

      // 更新聊天记录状态
      await this.chatMessage.update({
        aiResponse: fullResponse,
        streamStatus: STREAM_STATUS.COMPLETED,
        partialResponse: ''
      });

      // 更新用户对象的余额
      this.user.tokenBalance = billingResult.balanceAfter;

      console.log(`聊天完成 - 用户ID: ${this.userId}, 消耗Token: ${billingResult.tokensUsed} (输入:${billingResult.inputTokens}, 输出:${billingResult.outputTokens}), 数据源: ${billingResult.dataSource}, 剩余余额: ${billingResult.balanceAfter}`);

      return {
        success: true,
        tokensUsed: billingResult.tokensUsed,
        inputTokens: billingResult.inputTokens,
        outputTokens: billingResult.outputTokens,
        remainingBalance: billingResult.balanceAfter,
        balanceBefore: billingResult.balanceBefore,
        balanceAfter: billingResult.balanceAfter,
        dataSource: billingResult.dataSource
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
  async handleError(error, partialResponse = '') {
    if (this.chatMessage) {
      await this.chatMessage.update({
        streamStatus: STREAM_STATUS.ERROR,
        aiResponse: partialResponse || error.message || '处理失败'
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
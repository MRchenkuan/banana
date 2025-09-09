const { ChatMessage } = require('../models');
const TokenManager = require('./tokenManager');
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
  // ChatManager.createChatMessage 方法中
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
   * 保存完成的数据
   */
  async saveCompletedData(fullResponse, tokensUsed) {
    if (!this.chatMessage) {
      throw new Error('ChatMessage未初始化');
    }

    try {
      // 1. 更新聊天记录
      await this.chatMessage.update({
        aiResponse: fullResponse,
        tokensUsed: tokensUsed,
        streamStatus: STREAM_STATUS.COMPLETED,
        partialResponse: ''
      });

      // 2. 扣除用户token余额
      const remainingBalance = await TokenManager.deductTokens(this.user, tokensUsed);
      
      // 3. 更新用户对象的余额
      this.user.tokenBalance = remainingBalance;

      console.log(`聊天完成 - 用户ID: ${this.userId}, 消耗Token: ${tokensUsed}, 剩余余额: ${remainingBalance}`);

      return {
        success: true,
        tokensUsed: tokensUsed,
        remainingBalance: remainingBalance,
        balanceBefore: this.balanceBefore,
        balanceAfter: remainingBalance
      };
    } catch (error) {
      console.error('保存聊天数据失败:', error);
      
      // 保存失败时更新为错误状态
      if (this.chatMessage) {
        try {
          await this.chatMessage.update({
            streamStatus: STREAM_STATUS.ERROR,
            aiResponse: fullResponse || '保存失败',
            tokensUsed: tokensUsed
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
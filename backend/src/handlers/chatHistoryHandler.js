const { ChatMessage } = require('../models');
const ChatValidation = require('../utils/chatValidation');

class ChatHistoryHandler {
  constructor(req, res) {
    this.req = req;
    this.res = res;
  }
  
  async handle() {
    try {
      const { page, limit } = ChatValidation.validatePagination(
        this.req.query.page, 
        this.req.query.limit
      );
      const offset = (page - 1) * limit;
      
      const messages = await ChatMessage.findAll({
        where: { userId: this.req.user.userId },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      this.res.json({
        messages: messages.reverse().map(msg => ({
          id: msg.id,
          type: msg.type,
          userMessage: msg.userMessage,
          aiResponse: msg.aiResponse,
          imageUrl: msg.imageUrl,
          tokensUsed: msg.tokensUsed,
          createdAt: msg.createdAt,
          streamStatus: msg.streamStatus,
          isError: msg.streamStatus === 'error',
          isInterrupted: msg.streamStatus === 'interrupted',
          isPending: msg.streamStatus === 'pending'
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('获取聊天历史错误:', error);
      this.res.status(500).json({ error: error.message || '获取聊天历史失败' });
    }
  }
}

module.exports = ChatHistoryHandler;
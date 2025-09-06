const { ChatMessage } = require('../models');
const TokenManager = require('../utils/tokenManager');
const StreamManager = require('../utils/streamManager');
const { Session } = require('../models'); // 添加Session模型
const geminiTextService = require('../services/gemini/GeminiTextService'); // 添加文本服务
const SessionManager = require('../utils/sessionManager'); // 添加会话管理器

class BaseStreamHandler {
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.chatMessage = null;
    this.streamManager = null;
    this.partialResponse = '';
    this.tokensUsed = 0;
  }

  // 模板方法 - 定义处理流程
  async handle() {
    try {
      // 1. 预处理和验证
      await this.preProcess();
      
      // 2. 初始化流
      await this.initializeStream();
      
      // 3. 处理业务逻辑（子类实现）
      const result = await this.processBusinessLogic();
      
      // 4. 处理流式响应
      await this.handleStreamResponse(result);
      
      // 5. 完成处理
      await this.handleStreamComplete();
      
    } catch (error) {
      await this.handleError(error);
    }
  }

  // 抽象方法 - 子类必须实现
  async processBusinessLogic() {
    throw new Error('子类必须实现processBusinessLogic方法');
  }

  // 通用流初始化
  async initializeStream() {
    const { message, sessionId } = this.req.body;
    const userId = this.req.user.userId;
    
    // 获取用户信息和余额
    const userInfo = await TokenManager.getUserBalance(userId);
    this.user = userInfo.user;
    this.balanceBefore = userInfo.balance;
    
    // 创建聊天记录
    this.chatMessage = await ChatMessage.create({
      userId,
      sessionId,
      type: this.getMessageType(),
      userMessage: message,
      aiResponse: '',
      tokensUsed: 0,
      streamStatus: 'pending',
      partialResponse: ''
    });
    
    // 创建流管理器
    this.streamManager = new StreamManager(
      this.chatMessage, 
      this.user, 
      userId, 
      this.balanceBefore
    );
    
    this.streamManager.setupSSEHeaders(this.res);
  }

  // 处理流式响应的通用逻辑
  // 移除重复的processStream方法，统一使用handleStreamResponse
  
  async handleStreamResponse(serviceResult) {
    if (!serviceResult || !serviceResult.stream) {
      return;
    }

    let fullResponse = '';
    
    for await (const chunk of serviceResult.stream) {
      if (!this.streamManager.isConnected()) {
        break;
      }

      // 统一的数据块处理
      await this.sendChunk(chunk);
      
      // 累积响应内容
      if (chunk.content) {
        fullResponse += chunk.content;
        this.partialResponse += chunk.content;
      }
      
      // 累积token使用量
      this.tokensUsed += chunk.tokens || 0;
    }

    // 更新最终结果
    this.tokensUsed = serviceResult.totalTokensUsed || this.tokensUsed;
    this.fullResponse = fullResponse;
  }
  

  // 发送流式数据块
  async sendChunk(chunk) {
    if (!this.streamManager.isConnected()) {
      return;
    }
    
    const data = {
      type: chunk.type || 'chunk',
      content: chunk.content || chunk.text,  // 前端期望 text 字段
      tokens: chunk.tokens || chunk.estimatedTokens || 0,  // 保持向后兼容
    };
    
    this.res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // 抽象方法 - 获取消息类型
  getMessageType() {
    throw new Error('子类必须实现getMessageType方法');
  }


  async handleStreamComplete() {
    
    const result = await this.streamManager.saveCompletedData(
      this.fullResponse,
      this.tokensUsed
    );
    
    // 修复：统一发送完成消息并结束连接
    if (this.streamManager.isConnected()) {
      this.res.write(`data: ${JSON.stringify({
        type: 'complete',
        tokensUsed: this.tokensUsed,
        remainingBalance: result.remainingBalance,
      })}\n\n`);      
      this.res.end();
    }

    // 更新数据库状态
    await this.chatMessage.update({
      streamStatus: 'completed'
    });
  }


  async generatedTitle(fullResponse){
    // 新增：检查并生成会话标题
    let generatedTitle = null;
    try {
      const { sessionId } = this.req.body;
      if (sessionId) {
        
        // 查询会话信息
        const session = await Session.findByPk(sessionId);
        if (session && !session.titleSet) {
          console.log('会话标题未设置，开始生成标题...');
          
          // 构建对话上下文（用户消息 + AI回复）
          const { message } = this.req.body;
          const conversationContext = `用户: ${message}\nAI: ${fullResponse}`;
          
          // 生成标题
          generatedTitle = await geminiTextService.generateTitle(conversationContext);
          
          if (generatedTitle) {
            // 更新会话标题
            await SessionManager.updateSessionTitle(sessionId, generatedTitle);
            this.res.write(`data: ${JSON.stringify({
              type: 'title',
              title: generatedTitle
            })}\n\n`);
            console.log(`会话标题已更新: ${generatedTitle}`);
          }
        }
      }
    } catch (error) {
      console.error('生成会话标题时发生错误:', error);
      // 标题生成失败不影响主流程
    }
  }


  async cleanup(error = null) {
    if (this.streamManager) {
      await this.streamManager.cleanup();
    }
    
    if (error && this.chatMessage) {
      // 更新聊天记录状态为错误
      await this.chatMessage.update({
        streamStatus: 'error',
        aiResponse: error.message || '处理失败'
      });
    }
    
    if (this.streamManager?.isConnected() && !this.res.destroyed) {
      this.res.end();
    }
  }
}

module.exports = BaseStreamHandler;
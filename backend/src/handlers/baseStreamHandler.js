const { ChatMessage } = require('../models');
const TokenManager = require('../utils/tokenManager');
const StreamManager = require('../utils/streamManager');
const { Session } = require('../models');
const geminiTextService = require('../services/gemini/GeminiTextService');
const SessionManager = require('../utils/sessionManager');
const ChatManager = require('../utils/chatManager');

/**
 * 流式处理基础处理器
 * 提供流式聊天处理的通用框架，使用模板方法模式
 * 子类需要实现getStreamData()和preProcess()方法
 */
class BaseStreamHandler {
  /**
   * 构造函数
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  constructor(req, res) {
    this.req = req;
    this.res = res;
    this.chatMessage = null;
    this.streamManager = null;
    this.chatManager = null;
    this.partialResponse = '';
    this.tokensUsed = 0;
    this.fullResponse = '';
  }

  /** 
   * 主处理流程 - 简化职责 
   */ 
  // 在 BaseStreamHandler 中强制要求
  async handle() {
    try {
      // 1. 基础初始化（最早执行，确保基础设施可用）
      await this.initialize();
      
      // 2. 业务预处理（验证和准备）
      await this.preProcess();
      
      // 3. 流处理核心逻辑
      const streamData = await this.getStreamData();
      await this.processStream(streamData);
      
      // 4. 完成处理
      await this.handleStreamComplete();
    } catch (error) {
      await this.handleError(error);
    } finally {
      await this.cleanup();
    }
  }



  /**
   * 抽象方法 - 预处理验证
   * 子类必须实现此方法来定义具体的验证和预处理逻辑
   * @abstract
   * @async
   * @throws {Error} 当预处理失败时抛出错误
   */
  /**
   * 简化预处理 - 只做验证
   */
  async preProcess() {
    // 1. 业务验证
    await this.validateInput();
    
    // 2. 估算token消耗并检查余额
    const estimatedTokens = await this.estimateTokenUsage();
    await TokenManager.checkBalance(this.user, estimatedTokens);
  }

  /**
   * 抽象方法 - 估算token使用量
   * 子类必须实现此方法来估算具体的token消耗
   * @abstract
   * @async
   * @returns {number} 估算的token数量
   */
  async estimateTokenUsage() {
    throw new Error('子类必须实现estimateTokenUsage方法');
  }

  /**
   * 抽象方法 - 验证输入参数
   * 子类必须实现此方法来验证具体的输入参数
   * @abstract
   * @async
   * @throws {Error} 当输入验证失败时抛出错误
   */
  async validateInput() {
    throw new Error('子类必须实现validateInput方法');
  }

  /**
   * 通用流初始化
   * 创建聊天记录、初始化流管理器、设置SSE响应头
   * @async
   * @throws {Error} 当数据库操作失败时抛出错误
   */
  /**
   * 统一初始化 - 合并原来的initialize和initializeStream
   */
  async initialize() {
    // 1. 创建流管理器
    this.streamManager = new StreamManager();
    this.streamManager.setupSSEHeaders(this.res);
    
    // 2. 获取用户信息（从preProcess移过来）
    const userId = this.req.user.userId;
    const userInfo = await TokenManager.getUserBalance(userId);
    this.user = userInfo.user;
    this.balanceBefore = userInfo.balance;
    
    // 3. 创建聊天管理器
    this.chatManager = new ChatManager(
      this.user, 
      this.req.user.userId, 
      this.balanceBefore
    );
    
    // 4. 创建聊天记录
    const { message, sessionId } = this.req.body;
    await this.chatManager.createChatMessage({
      sessionId,
      message,
      type: this.getMessageType()
    });
    
    this.startTime = Date.now();
  }

  /** 
   * 抽象方法 - 子类提供数据源 
   */ 
  async getStreamData() { 
    throw new Error('子类必须实现getStreamData方法'); 
  }

  /** 
   * 统一的流处理逻辑 
   */ 
  async processStream(streamData) { 
    if (!streamData || !streamData.stream) { 
      throw new Error('无效的流数据'); 
    } 

    let fullResponse = ''; 
    
    for await (const chunk of streamData.stream) { 
      if (!this.streamManager.isConnected()) { 
        break; 
      } 

      await this.sendChunk(chunk); 
      
      if (chunk.content) { 
        fullResponse += chunk.content; 
        this.partialResponse += chunk.content; 
      } 
      
      this.tokensUsed += chunk.tokens || 0; 
    } 

    this.fullResponse = fullResponse; 

    // 生成标题
    await this.generateTitleIfNeeded();
  }

  /** 
   * 集成标题生成到主流程 
   */ 
  async generateTitleIfNeeded() { 
    if (!this.fullResponse) return;
    
    const { sessionId } = this.req.body;
    if (!sessionId) return;
    
    try {
      const session = await Session.findByPk(sessionId);
      if (session && !session.titleSet) {
        console.log('会话标题未设置，开始生成标题...');
        await this.generateAndUpdateTitle(sessionId);
      }
    } catch (error) {
      console.error('检查会话标题状态时发生错误:', error);
    }
  }

  /**
   * 生成并更新会话标题
   * @param {string} sessionId - 会话ID
   */
  async generateAndUpdateTitle(sessionId) {
    try { 
      const { message } = this.req.body;
      const conversationContext = `用户: ${message}\nAI: ${this.fullResponse}`;
  
      const generatedTitle = await geminiTextService.generateTitle(conversationContext);
  
      if (generatedTitle) {
        await SessionManager.updateSessionTitle(sessionId, generatedTitle);
        await this.sendTitle(generatedTitle);
        console.log(`会话标题已更新: ${generatedTitle}`);
      }
    } catch (error) {
      console.error('生成会话标题时发生错误:', error);
    }
  }

  /**
   * 发送流式数据块到前端
   * 将数据块格式化为前端期望的格式并发送
   * @async
   * @param {Object} chunk - 数据块对象
   * @param {string} [chunk.content] - 数据块内容
   * @param {string} [chunk.text] - 数据块文本（向后兼容）
   * @param {number} [chunk.tokens] - token使用量
   * @param {number} [chunk.estimatedTokens] - 估计token使用量（向后兼容）
   */
  async sendChunk(chunk) {
    this._sendData({
      type: 'text',
      content: chunk.content || chunk.text,
      tokens: chunk.tokens || chunk.estimatedTokens || 0,
    });
  }

  /**
   * 发送会话标题更新消息
   * @async
   * @param {string} title - 新的会话标题
   */
  async sendTitle(title){
    this._sendData({
      type: 'set-session-title',
      title: title
    });
  }

  /**
   * 发送处理状态消息
   * @async
   * @param {string} message - 处理状态描述
   */
  async sendProcessing(message){
    this._sendData({
      type: 'processing',
      message,
    });
  }

  /**
   * 发送错误消息到前端
   * @async
   * @param {Object} errorInfo - 错误信息对象
   * @param {string} errorInfo.message - 错误消息
   * @param {number} errorInfo.code - 错误代码
   */
  async sendError({message, code}){
    this._sendData({
      type: 'error',
      message,
      code
    });
  }

  
  // 同时修改 sendComplete 和 sendError
  async sendComplete(data = {}) {
    if (!this.streamManager.isConnected()) {
      return;
    }
    
    // 内部获取最新的用户余额
    const currentBalance = this.user ? this.user.tokenBalance : null;
    
    const completeData = {
      ...data,
      type: 'complete',
      tokensUsed: this.tokensUsed,
      remainingBalance: currentBalance,
    };
    
    try {
      // 对于重要的complete消息，使用回调确保发送
      return new Promise((resolve) => {
        this.res.write(`data: ${JSON.stringify(completeData)}\n\n`, () => {
          this.res.end();
          resolve();
        });
      });
    } catch (error) {
      console.error('发送完成消息失败:', error);
      this.res.end();
    }
  }

  /**
   * 处理流式响应完成后的操作
   * 保存完成的数据、发送完成消息、更新数据库状态
   * @async
   */
  async handleStreamComplete() {
    const result = await this.chatManager.saveCompletedData(
      this.fullResponse,
      this.tokensUsed
    );
    
    this.sendComplete({
      tokensUsed: this.tokensUsed,
      remainingBalance: result.remainingBalance,
    })
  }

  /**
   * 通用错误处理
   * 发送错误响应到前端并记录错误日志
   * @async
   * @param {Error} error - 错误对象
   * @param {string} [error.message] - 错误消息
   * @param {number} [error.code] - 错误代码
   */
  async handleError(error) {    
    // 业务层处理错误
    if (this.chatManager) {
      await this.chatManager.handleError(error, this.partialResponse);
    }
    
    // 流层发送错误响应
    this.sendError({
        message: error.message || '服务暂时不可用',
        code: error.code || -1
    })
  }

  /**
   * 清理资源
   * 清理流管理器、更新错误状态、关闭响应连接
   * @async
   * @param {Error} [error=null] - 可选的错误对象，如果提供则更新聊天记录为错误状态
   */
  // 修改 cleanup 方法
  async cleanup(error = null) {
    // 1. 处理业务层清理
    if (this.chatManager) {
      if (error) {
        await this.chatManager.handleError(error);
      } else {
        await this.chatManager.handleInterruption();
      }
    }
    
    // 2. 处理流层清理
    if (this.streamManager) {
      this.streamManager.cleanup();
    }
  }

  /**
   * 内部方法 - 发送SSE数据
   * 检查连接状态并发送格式化的SSE数据
   * @async
   * @param {Object} data - 要发送的数据对象
   * @private
   */
  async _sendData(data) {
    if (this.streamManager) {
      return this.streamManager.sendData(data);
    }
    return false;
  }

  /**
   * 抽象方法 - 获取消息类型
   * 子类必须实现此方法来返回具体的消息类型
   * @abstract
   * @returns {string} 消息类型（如'text', 'image'等）
   * @throws {Error} 子类未实现时抛出错误
   */
  getMessageType() {
    throw new Error('子类必须实现getMessageType方法');
  }
}

module.exports = BaseStreamHandler;

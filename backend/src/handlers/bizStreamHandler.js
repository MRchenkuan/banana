const BaseStreamHandler = require('./baseStreamHandler');
const TokenManager = require('../utils/tokenManager');
const StreamManager = require('../utils/streamManager');
const { Session } = require('../models');
const geminiTextService = require('../services/gemini/GeminiTextService');
const SessionManager = require('../utils/sessionManager');
const ChatManager = require('../utils/chatManager');


/**
 * 业务流式处理器 - 业务逻辑层
 * 负责聊天相关的业务逻辑：用户验证、token管理、会话管理等
 */
class BizStreamHandler extends BaseStreamHandler {

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
   * 抽象方法 - 子类提供数据源 
   */ 
  async getStreamData() { 
    throw new Error('子类必须实现getStreamData方法'); 
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

module.exports = BizStreamHandler;
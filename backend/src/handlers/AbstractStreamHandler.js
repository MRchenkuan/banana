const BaseStreamHandler = require("./BaseStreamHandler");
const TokenManager = require("../utils/tokenManager");
const StreamManager = require("../utils/streamManager");
const { Session } = require("../models");
const geminiTextService = require("../services/gemini/GeminiTextService");
const SessionManager = require("../utils/sessionManager");
const ChatManager = require("../utils/chatManager");
const RosService = require("../services/file_process/RosService");

/**
 * 业务流式处理器 - 业务逻辑层
 * 负责聊天相关的业务逻辑：用户验证、token管理、会话管理等
 */
class AbstractStreamHandler extends BaseStreamHandler {
  fullResponse = "";
  /**
   * 聊天管理器
   * @type {ChatManager}
   */
  chatManager = null;
  tokensUsed = 0;
  user = null;
  balanceBefore = 0;
  startTime = null;

  /**
   * 主处理流程 - 简化职责
   */
  async handle() {
    try {
      // 1. 初始化阶段 - 纯基础设施初始化
      await this.initialize();
      
      // 2. 验证阶段 - 纯验证逻辑
      await this.validate();

      // 3. 预处理阶段 - 纯数据处理和记录创建
      await this.prepare();
      
      // 4. 流处理阶段 - 纯业务逻辑
      await this.processStream();
      
    } catch (error) {
      await this.handleError(error);
    } finally {
      // 5. 完成阶段
      await this.handleStreamComplete();

      // 5. 清理阶段
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
  /**
   * 初始化阶段 - 纯基础设施初始化
   */
  async initialize() {
    // 1. 获取用户信息
    const userId = this.req.user.userId;
    const userInfo = await TokenManager.getUserBalance(userId);
    this.user = userInfo.user;
    this.balanceBefore = userInfo.balance;
    
    // 2. 创建管理器实例
    this.chatManager = new ChatManager(
      this.user,
      this.req.user.userId,
      this.balanceBefore
    );
    
    // 3. 初始化计时器
    this.startTime = Date.now();
    
    // 4. 预创建聊天消息（从prepare方法移动过来）
    const { sessionId } = this.req.body;
    if (sessionId) {
      try {
        // 验证会话存在性
        const { Session } = require('../models');
        const session = await Session.findOne({
          where: {
            id: sessionId,
            userId: this.req.user.userId, // 修复：使用正确的用户ID
            isActive: true
          }
        });
        
        if (session) {
          // 创建初始聊天消息
          const message = this.req.body.message || '';
          await this.chatManager.createChatMessage({
            sessionId,
            message: message, // 先用原始消息创建，后续在prepare中更新
          });
        }
      } catch (error) {
        console.error('预创建聊天消息失败:', error);
        // 不抛出异常，让验证阶段处理
      }
    }
  }

  /**
   * 抽象方法 - 预处理验证
   * 子类必须实现此方法来定义具体的验证和预处理逻辑
   * @abstract
   * @async
   * @throws {Error} 当预处理失败时抛出错误
   */
  async prepare() {
    const { message, sessionId } = this.req.body;
    const images = this.req.files;
  
    // 处理用户图片
    const userImageMarkdown = await this._saveUserImages(images, this.user);
  
    // 将用户消息和图片Markdown合并
    if (userImageMarkdown) {
      const fullUserMessage = userImageMarkdown + '\n\n' + message;
      
      // 更新已创建的消息内容
      if (this.chatManager && this.chatManager.chatMessage) {
        await this.chatManager.chatMessage.update({
          userMessage: fullUserMessage
        });
      }
    }
  }


  /**
   * 统一的流处理逻辑
   */
  async processStream() {
    try {
      const { stream } = await this.getStreamData();

      for await (const chunk of stream) {
        const {type, content, tokenUsed} = chunk;
        const {actual, estimated } = tokenUsed||{};
        
        if(actual.total > estimated.total){ 
          this.tokensUsed = actual
        } else {
          this.tokensUsed = estimated;
        }

        // 基本只有text 类型
        if (type === 'text') {
          this.fullResponse += content;
          await this.sendMessageChunk({
            type,
            content,
            tokenUsed: this.tokensUsed
          });
        }
        
        if (type === 'usage_final') {
          // chunk 读完时做的处理
          this.fullResponse = content
        }
      }
      
      // 移除这行，让 handle() 统一处理
      // await this.handleStreamComplete(userMessage);
    } catch (error) {
      await this.handleError(error);
    }
  }

  async handleStreamComplete() {    
    let result = {
      tokensUsed: 0,
      inputTokens: 0,
      outputTokens: 0,
      remainingBalance: this.balanceBefore,
      dataSource: ''
    };
    try {
      // 生成标题
      await this.generateTitleIfNeeded();
    } catch (error) {
      console.error('生成标题时出错:', error);
    }

    try {
      // 保存完成数据
      if (this.chatManager && this.chatManager.chatMessage) {
        result = await this.chatManager.saveCompletedData(
          this.fullResponse,
          this.tokensUsed,
        );
      }
    } catch (error) {
      console.error('处理流完成时出错:', error);
      this.handleError(error);
      // 不抛出异常，继续发送完成消息
    } finally {
      // 发送完成消息
      this.sendComplete({
        tokensUsed: result.tokensUsed,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        remainingBalance: result.balanceAfter,
      });
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
  async sendMessageChunk(chunk) {
    this.sendMessagge({
      ...chunk
    });
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
      await this.chatManager.handleError(error);
    }

    // 流层发送错误响应
    this.sendError({
      message: error.message || "服务暂时不可用",
      code: error.code || -1,
    });
  }

  /**
   * 清理资源
   * 清理流管理器、更新错误状态、关闭响应连接
   * @async
   * @param {Error} [error=null] - 可选的错误对象，如果提供则更新聊天记录为错误状态
   */
  async cleanup() {
    // 清理临时文件
    if (this.req.files && this.req.files.length > 0) {
      const fs = require('fs');
      for (const file of this.req.files) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`临时文件已删除: ${file.path}`);
          }
        } catch (error) {
          console.error(`清理临时文件失败: ${file.path}`, error);
        }
      }
    }
    
    // 原有的cleanup逻辑
    if (this.streamManager && this.streamManager.isConnected()) {
      if(this.chatManager){
        await this.chatManager.handleInterruption();
      }
      this.streamManager.cleanup();
    }
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
        console.log("会话标题未设置，开始生成标题...");
        await this.generateAndUpdateTitle(sessionId);
      }
    } catch (error) {
      console.error("检查会话标题状态时发生错误:", error);
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

      const generatedTitle = await geminiTextService.generateTitle(
        conversationContext
      );

      if (generatedTitle) {
        await SessionManager.updateSessionTitle(sessionId, generatedTitle);
        await this.sendTitle(generatedTitle);
        console.log(`会话标题已更新: ${generatedTitle}`);
      }
    } catch (error) {
      console.error("生成会话标题时发生错误:", error);
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
    throw new Error("子类必须实现estimateTokenUsage方法");
  }

  /**
   * 抽象方法 - 验证输入参数
   * 子类必须实现此方法来验证具体的输入参数
   * @abstract
   * @async
   * @throws {Error} 当输入验证失败时抛出错误
   */
  
  /**
   * 验证阶段 - 纯验证逻辑，不涉及任何状态修改
   */
  async validate() {
    // 1. 输入参数验证
    await this.validateInput();
    
    // 2. 权限验证
    await this.validatePermissions();
    
    // 3. 业务规则验证
    await this.validateBusinessRules();
    
    // 4. Token余额预检查（不扣费）
    const estimatedTokens = await this.estimateTokenUsage();
    await TokenManager.checkBalance(this.req.user.userId, estimatedTokens);
  }
  
  // 子类可重写的验证方法
  async validateInput() {
    const { message, sessionId } = this.req.body;
    if (!message || !sessionId) {
      throw new Error('缺少必要参数');
    }
  }
  
  async validatePermissions() {
    // 基础权限验证
  }
  
  async validateBusinessRules() {
    const { sessionId } = this.req.body;
    const userId = this.req.user.userId;
    
    // 验证 sessionId 是否存在且属于当前用户
    const session = await Session.findOne({
      where: {
        id: sessionId,
        userId: userId,
        isActive: true
      }
    });
    
    if (!session) {
      throw new Error('会话不存在或已被删除，请刷新页面后重试');
    }
  }

  /**
   * 抽象方法 - 子类提供数据源
   */
  async getStreamData() {
    throw new Error("子类必须实现getStreamData方法");
  }

  // 新增方法：保存用户图片
  async _saveUserImages(images, user) {

    if (!images || images.length === 0) {
      return '';
    }
    
    const markdownLinks = [];
    
    for (const image of images) {
      try {
        const fs = require('fs');
        
        // 读取图片文件
        const buffer = fs.readFileSync(image.path);
        
        // 生成文件名和ROS key
        const fileName = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${image.originalname}`;
        const imageKey = RosService.generateImageKey(fileName, 'user-upload', user?.id);
        
        // 上传到ROS
        const uploadResult = await RosService.uploadBuffer(buffer, imageKey, {
          contentType: image.mimetype
        });
        
        // 保存媒体资源记录
        const MediaResource = require('../models/MediaResource');
        await MediaResource.create({
          userId: user?.id,
          fileName: fileName,
          originalName: image.originalname,
          fileSize: uploadResult.size || buffer.length,
          mimeType: image.mimetype,
          storageType: 'ros',
          storageKey: uploadResult.key,
          storageUrl: uploadResult.url,
          source: 'user_upload'
        });
        
        // 生成Markdown链接
        markdownLinks.push(`![${image.originalname}](${uploadResult.url})`);
        
        console.log(`用户图片已保存: ${fileName} -> ${uploadResult.url}`);
        
      } catch (error) {
        console.error('保存用户图片失败:', error);
        markdownLinks.push(`[图片上传失败: ${image.originalname}]`);
      }
    }
    
    return markdownLinks.join('\n');
  }

}

module.exports = AbstractStreamHandler;
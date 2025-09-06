const TokenManager = require('./tokenManager');
const { STREAM_STATUS } = require('../constants/streamStatus');

class StreamManager {
  constructor(chatMessage, user, userId, balanceBefore) {
    // 连接管理属性
    this.isClientConnected = true;
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.streamIterator = null;
    this.HEARTBEAT_INTERVAL = 10000;
    this.CONNECTION_TIMEOUT = 30000;
    
    // 数据管理属性
    this.chatMessage = chatMessage;
    this.user = user;
    this.userId = userId;
    this.balanceBefore = balanceBefore;
  }
  
  // ========== 连接管理方法 ==========
  
  setupSSEHeaders(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no'
    });
  }
  
  setupConnectionListeners(req, res, savePartialData) {
    const cleanup = () => savePartialData('断开');
    req.on('close', cleanup);
    req.on('error', cleanup);
    req.on('aborted', cleanup);
    res.on('error', cleanup);
    res.on('close', cleanup);
  }
  
  startHeartbeat(res, savePartialData) {
    const checkConnection = () => {
      if (!this.isClientConnected) return;
      
      try {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
        this.lastHeartbeat = Date.now();
      } catch (error) {
        console.log('心跳发送失败，连接可能已断开');
        savePartialData('心跳失败');
        return;
      }
      
      if (Date.now() - this.lastHeartbeat > this.CONNECTION_TIMEOUT) {
        console.log('连接超时');
        savePartialData('超时');
        return;
      }
    };
    
    this.heartbeatInterval = setInterval(checkConnection, this.HEARTBEAT_INTERVAL);
  }
  
  async cleanup() {
    this.isClientConnected = false;
    
    // 清理心跳检测
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // 主动中断 Gemini 流式请求
    if (this.streamIterator && typeof this.streamIterator.return === 'function') {
      try {
        await this.streamIterator.return();
        console.log('已中断 Gemini 流式请求');
      } catch (returnError) {
        console.error('中断 Gemini 请求时出错:', returnError);
      }
    }
  }
  
  setStreamIterator(iterator) {
    this.streamIterator = iterator;
  }
  
  disconnect() {
    this.isClientConnected = false;
  }
  
  isConnected() {
    return this.isClientConnected;
  }
  
  // ========== 数据管理方法 ==========
  
  // 保存中断的流式数据
  async saveInterruptedData(partialResponse, reason = 'interrupted') {
    if (!this.chatMessage || !partialResponse) {
      return null;
    }
    
    try {
      const estimatedTokensUsed = Math.max(10, TokenManager.estimateTokens(partialResponse));
      
      // 更新聊天记录
      await this.chatMessage.update({
        streamStatus: 'interrupted',
        partialResponse: partialResponse,
        aiResponse: partialResponse + ` [连接${reason}]`,
        tokensUsed: estimatedTokensUsed
      });
      
      // 处理 Token 扣除和记录
      if (this.user && estimatedTokensUsed > 0) {
        await this._handleTokenDeduction(estimatedTokensUsed, reason);
      }
      
      console.log(`已保存${reason}的聊天记录，ID: ${this.chatMessage.id}`);
      return this.chatMessage;
    } catch (error) {
      console.error(`保存${reason}数据时出错:`, error);
      throw error;
    }
  }
  
  // 保存完整的流式数据
  async saveCompletedData(fullResponse, tokensUsed) {
    if (!this.chatMessage) {
      throw new Error('聊天记录不存在');
    }
    
    try {
      const remainingBalance = await TokenManager.deductTokens(this.user, tokensUsed);
      
      await this.chatMessage.update({
        aiResponse: fullResponse,
        tokensUsed: tokensUsed,
        streamStatus: 'completed',
        partialResponse: null
      });
      
      // 记录 token 使用
      await TokenManager.recordTokenUsage({
        userId: this.userId,
        chatMessageId: this.chatMessage.id,
        tokensUsed,
        operation: 'chat',
        balanceBefore: this.balanceBefore,
        balanceAfter: remainingBalance
      });
      
      return { chatMessage: this.chatMessage, remainingBalance };
    } catch (error) {
      console.error('保存完整数据时出错:', error);
      throw error;
    }
  }
  
  // 保存错误状态的数据
  async saveErrorData(errorMessage) {
    if (!this.chatMessage) {
      throw new Error('聊天记录不存在');
    }
    
    try {
      await this.chatMessage.update({
        streamStatus: STREAM_STATUS.ERROR,
        aiResponse: `[发生错误: ${errorMessage}]`,
        partialResponse: null
      });
      
      return this.chatMessage;
    } catch (error) {
      console.error('保存错误数据时出错:', error);
      throw error;
    }
  }
  
  // ========== 清理管理方法 ==========
  
  // 执行完整的清理流程（合并原 StreamCleanupManager 功能）
  async performCleanup(partialResponse, reason = 'interrupted') {
    if (!this.isConnected()) {
      return;
    }
    
    console.log(`连接${reason}，开始清理资源`);
    
    try {
      // 1. 断开连接
      this.disconnect();
      
      // 2. 清理流式管理器资源
      await this.cleanup();
      
      // 3. 保存部分数据
      if (partialResponse) {
        await this.saveInterruptedData(partialResponse, reason);
      }
      
      console.log(`清理完成: ${reason}`);
    } catch (error) {
      console.error(`清理过程中出错:`, error);
      throw error;
    }
  }
  
  // ========== 私有方法 ==========
  
  // 私有方法：处理 Token 扣除
  async _handleTokenDeduction(tokensUsed, reason) {
    await TokenManager.deductTokens(this.user, tokensUsed);
    
    await TokenManager.recordTokenUsage({
      userId: this.userId,
      chatMessageId: this.chatMessage.id,
      tokensUsed,
      operation: 'chat', // 统一使用 'chat'
      balanceBefore: this.balanceBefore,
      balanceAfter: this.balanceBefore - tokensUsed
    });
  }
}

module.exports = StreamManager;
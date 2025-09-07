import TextMessageHandler from '../messageHandlers/TextMessageHandler';
import ProcessingMessageHandler from '../messageHandlers/ProcessingMessageHandler';
import CompleteMessageHandler from '../messageHandlers/CompleteMessageHandler';
import ErrorMessageHandler from '../messageHandlers/ErrorMessageHandler';
import TitleMessageHandler from '../messageHandlers/TitleMessageHandler';

/**
 * 消息处理器工厂
 */
class MessageHandlerFactory {
  static COMPLETION_TYPES = new Set(['complete', 'error']);

  constructor(context) {
    this.context = context;
    this.handlers = new Map();
    this.initializeHandlers();
  }

  initializeHandlers() {
    this.handlers.set('text', new TextMessageHandler(this.context));
    this.handlers.set('processing', new ProcessingMessageHandler(this.context));
    this.handlers.set('complete', new CompleteMessageHandler(this.context));
    this.handlers.set('error', new ErrorMessageHandler(this.context));
    this.handlers.set('set-session-title', new TitleMessageHandler(this.context));
  }

  /**
   * 获取消息处理器
   * @param {string} type - 消息类型
   * @returns {BaseMessageHandler} 处理器实例
   */
  getHandler(type) {
    const handler = this.handlers.get(type);
    if (!handler) {
      console.warn(`未找到类型为 '${type}' 的消息处理器`);
      return null;
    }
    return handler;
  }

  /**
   * 处理消息
   * @param {string} type - 消息类型
   * @param {Object} data - 消息数据
   * @param {Object} metadata - 元数据
   */
  handleMessage(type, data, metadata) {
    const handler = this.getHandler(type);
    if (handler) {
      try {
        handler.handle(data, metadata);
        
        // 统一处理 loading 状态重置
        if (MessageHandlerFactory.COMPLETION_TYPES.has(type) && metadata.setLoading) {
          metadata.setLoading(false);
        }
      } catch (error) {
        console.error(`处理 '${type}' 类型消息时出错:`, error);
        // 发生错误时也重置 loading
        if (metadata.setLoading) {
          metadata.setLoading(false);
        }
      }
    }
  }

  /**
   * 注册新的消息处理器
   * @param {string} type - 消息类型
   * @param {BaseMessageHandler} handler - 处理器实例
   */
  registerHandler(type, handler) {
    this.handlers.set(type, handler);
  }
}

export default MessageHandlerFactory;
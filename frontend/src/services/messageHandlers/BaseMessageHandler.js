/**
 * 消息处理器基类
 */
class BaseMessageHandler {
  constructor(context) {
    this.context = context; // 包含 setMessages, updateBalance 等上下文方法
  }

  /**
   * 处理消息的抽象方法
   * @param {Object} data - 消息数据
   * @param {Object} metadata - 元数据（如 messageId, sessionId 等）
   */
  handle(data, metadata) {
    throw new Error('子类必须实现 handle 方法');
  }

  /**
   * 验证消息数据格式
   */
  validate(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('无效的消息数据格式');
    }
    return true;
  }
}

export default BaseMessageHandler;
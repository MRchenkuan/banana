import BaseMessageHandler from './BaseMessageHandler';
// 移除 import { message } from 'antd';

/**
 * 错误消息处理器
 */
class ErrorMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    const { message: errorMessage, code } = data;
    const { thinkingMessageId, onError } = metadata;
    
    // 移除错误提示
    // message.error(errorMessage);
    
    // 创建错误消息卡片
    this.context.setMessages((prev) => {
      const filteredMessages = prev.filter(
        (msg) => msg.id !== thinkingMessageId
      );

      const errorMsg = {
        id: thinkingMessageId + 1,
        type: "error",
        content: errorMessage || "处理请求时出现错误，请稍后重试。",
        timestamp: new Date(),
        role: "assistant",
        isError: true,
        tokensUsed: 0,
      };

      return [...filteredMessages, errorMsg];
    });
    
    // 调用错误回调
    onError && onError(errorMessage);
  }
}

export default ErrorMessageHandler;
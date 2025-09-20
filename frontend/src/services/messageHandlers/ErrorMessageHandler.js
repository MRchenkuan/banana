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
    
    this.context.setMessages((prev) => {
      if(msg.id === thinkingMessageId){

      }

      
      const errorMsg = {
        id: generateUniqueId(), // 生成新的唯一ID
        type: "error",
        content: errorMessage || "处理请求时出现错误，请稍后重试。",
        timestamp: new Date(),
        role: "assistant",
        isError: true,
        tokensUsed: 0,
      };

      return [...prev, errorMsg]; // 保留所有现有消息，包括思考状态卡片
    });
    
    // 调用错误回调
    onError && onError(errorMessage);
  }
}

// 生成唯一ID的辅助函数
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default ErrorMessageHandler;
import BaseMessageHandler from './BaseMessageHandler';

/**
 * 文本消息处理器
 */
class TextMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { content, tokens } = data;
    const { messageId, thinkingMessageId, onChunk } = metadata;
    
    // 更新消息内容
    this.context.setMessages((prev) => {
      const existingMessage = prev.find(msg => msg.id === messageId);
      const thinkingMessage = prev.find(msg => msg.id === thinkingMessageId);
      
      if (existingMessage) {
        // 如果AI消息已存在，追加内容
        return prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + content,
                estimatedTokens: tokens,
              }
            : msg
        );
      } else if (thinkingMessage) {
        // 如果thinking消息存在但AI消息不存在，更新thinking消息内容
        // 关键修改：保持原始ID不变，只更新内容和状态
        return prev.map((msg) =>
          msg.id === thinkingMessageId
            ? {
                ...msg,
                // id: messageId, // 移除这行，保持原始ID
                type: "text",
                content: content, // 替换为实际内容
                isThinking: false, // 移除thinking状态
                isStreaming: true,
                isNewMessage: true,
                estimatedTokens: tokens,
              }
            : msg
        );
      } else {
        // 如果都不存在，创建新的AI消息
        const aiMessage = {
          id: messageId,
          type: "text",
          content: content,
          timestamp: new Date(),
          role: "assistant",
          isStreaming: true,
          isNewMessage: true,
          estimatedTokens: tokens,
        };
        return [...prev, aiMessage];
      }
    });
    
    // 调用回调
    onChunk && onChunk(content, tokens);
  }
}

export default TextMessageHandler;
import BaseMessageHandler from './BaseMessageHandler';

/**
 * 图片消息处理器
 */
class ImageMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { content, tokens, imageUrl, fileSize, fileName } = data;
    const { messageId, thinkingMessageId, onChunk } = metadata;
    
    // 更新消息内容
    this.context.setMessages((prev) => {
      const existingMessage = prev.find(msg => msg.id === messageId);
      const thinkingMessage = prev.find(msg => msg.id === thinkingMessageId);
      
      if (existingMessage) {
        // 如果AI消息已存在，更新图片信息
        return prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: msg.content + (content || ''),
                imageUrl: imageUrl || msg.imageUrl,
                fileSize: fileSize || msg.fileSize,
                fileName: fileName || msg.fileName,
                estimatedTokens: tokens,
              }
            : msg
        );
      } else if (thinkingMessage) {
        // 如果thinking消息存在但AI消息不存在，将thinking消息转换为AI图片消息
        return prev.map((msg) =>
          msg.id === thinkingMessageId
            ? {
                ...msg,
                id: messageId, // 更改ID
                type: "image",
                messageType: "image", // 添加messageType字段
                content: content || '', // 图片描述文本
                imageUrl: imageUrl, // 图片URL
                fileSize: fileSize, // 文件大小
                fileName: fileName, // 文件名
                isThinking: false, // 移除thinking状态
                isStreaming: true,
                isNewMessage: true,
                estimatedTokens: tokens,
              }
            : msg
        );
      } else {
        // 如果都不存在，创建新的AI图片消息
        const aiMessage = {
          id: messageId,
          type: "image",
          messageType: "image", // 添加messageType字段
          content: content || '', // 图片描述文本
          imageUrl: imageUrl, // 图片URL
          fileSize: fileSize, // 文件大小
          fileName: fileName, // 文件名
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

export default ImageMessageHandler;
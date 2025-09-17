import BaseMessageHandler from './BaseMessageHandler';

/**
 * 用户消息更新处理器
 */
class UserMessageUpdateHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { content, messageId } = data;
    
    // 更新用户消息内容，将blob URL替换为实际URL
    this.context.setMessages((prev) => {
      return prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              // content: content,  // 已注释掉，不替换图片内容
              isUploading: false // 移除上传状态
            }
          : msg
      );
    });
  }
}

export default UserMessageUpdateHandler;
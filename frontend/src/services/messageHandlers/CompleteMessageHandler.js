import BaseMessageHandler from './BaseMessageHandler';

/**
 * 完成消息处理器
 */
class CompleteMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { tokensUsed, remainingBalance, title } = data;
    const { messageId, thinkingMessageId, sessionId, onComplete, setLoading } = metadata;
    
    // 更新消息状态为完成
    this.context.setMessages((prev) => {
      const filteredMessages = prev.filter(
        (msg) => msg.id !== thinkingMessageId
      );
      return filteredMessages.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              isStreaming: false,
              tokensUsed: tokensUsed,
              estimatedTokens: undefined,
            }
          : msg
      );
    });
    
    // 更新余额
    this.context.updateBalance(remainingBalance);
    
    // 处理会话标题更新
    if (title) {
      this.context.setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, title: title }
            : session
        )
      );
    }
    
    // 更新会话统计
    this.context.setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              messageCount: (session.messageCount || 0) + 1,
              lastMessageAt: new Date().toISOString(),
            }
          : session
      )
    );
    
    // 调用完成回调
    onComplete && onComplete({
      tokensUsed,
      remainingBalance,
      title
    });
    
    // 重置 loading 状态
    if (setLoading) {
      setLoading(false);
    }
  }
}

export default CompleteMessageHandler;
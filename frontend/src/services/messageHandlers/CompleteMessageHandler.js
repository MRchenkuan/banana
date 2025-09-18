import BaseMessageHandler from './BaseMessageHandler';
import { tokenMonitorEvents } from '../../utils/tokenMonitorEvents';

/**
 * 完成消息处理器
 */
class CompleteMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { tokensUsed, inputTokens, outputTokens, remainingBalance, title } = data;
    const { messageId, thinkingMessageId, sessionId, onComplete, setLoading } = metadata;
    
    // 向TokenMonitor发送token数据
    if (tokensUsed || inputTokens || outputTokens) {
      const tokenData = {
        total: tokensUsed || (inputTokens + outputTokens),
        input: inputTokens,
        output: outputTokens
      };
      
      tokenMonitorEvents.publish({
        totalTokensUsed: tokenData,
        timestamp: new Date(),
        messageType: 'complete'
      });
    }
    
    // 更新消息状态为完成
    this.context.setMessages((prev) => {
      return prev.map((msg) =>
        msg.id === thinkingMessageId
          ? {
              ...msg,
              isStreaming: false,
              isThinking: false,
              tokensUsed: tokensUsed,
              estimatedTokens: undefined,
            }
          : msg
      );
    }, sessionId); // 确保传递sessionId
    
    // 更新余额
    this.context.updateBalance(remainingBalance);
    
    // 处理会话标题更新 - 改进逻辑
    if (title && sessionId) {
      this.context.setSessions((prev) => {
        const existingSession = prev.find(session => session.id === sessionId);
        if (existingSession) {
          // 更新现有会话
          return prev.map((session) =>
            session.id === sessionId
              ? { ...session, title: title }
              : session
          );
        } else {
          // 如果会话不存在，可能是新创建的会话，添加到列表顶部
          const newSession = {
            id: sessionId,
            title: title,
            messageCount: 1,
            lastMessageAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          return [newSession, ...prev];
        }
      });
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
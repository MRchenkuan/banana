import BaseMessageHandler from './BaseMessageHandler';
import { tokenMonitorEvents } from '../../utils/tokenMonitorEvents';

/**
 * 完成消息处理器
 */
class CompleteMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { tokensUsed, inputTokens, outputTokens, remainingBalance } = data;
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
    this.context.setMessages((prev) => prev.map((msg) =>{
        if(msg.id === thinkingMessageId){
          debugger
          return {
            ...msg,
            isStreaming: false,
            isThinking: false,
            tokensUsed: tokensUsed,
            isReceived: true,
          }
        } else {
          return msg;
        }
      }), sessionId); // 确保传递sessionId
    
    // 更新余额
    this.context.updateBalance(remainingBalance);
    
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
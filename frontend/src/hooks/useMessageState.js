import { useMemo } from 'react';

export const useMessageState = (message) => {
  return useMemo(() => {
    const isUser = message.role === 'user';
    const isAssistant = message.role === 'assistant';
    const isThinking = message.isThinking;
    const isError = message.isError;
    const isInterrupted = message.isInterrupted || message.streamStatus === 'interrupted';
    const isPending = message.isPending || message.streamStatus === 'pending';
    const isStreaming = message.isStreaming || message.streamStatus === 'streaming';
    const messageType = message.messageType || message.type || 'text';
    const isHistoryMessage = message.tokensUsed !== undefined && 
                           !isStreaming && 
                           !message.isNewMessage;
    
    // 计算是否应该启动打字机效果
    const shouldStartTypewriter = isAssistant && 
                                !isThinking && 
                                !isError && 
                                !isInterrupted && 
                                !isPending && 
                                !isHistoryMessage;
    
    return {
      isUser,
      isAssistant,
      isThinking,
      isError,
      isInterrupted,
      isPending,
      isStreaming,
      messageType,
      isHistoryMessage,
      shouldStartTypewriter
    };
  }, [message]);
};
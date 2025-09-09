import React from 'react';

const MessageMeta = ({ message, messageState, elapsedTime }) => {
  const { isThinking, isError, isInterrupted, isPending, isStreaming, isUser } = messageState;
  
  const getStatusText = () => {
    if (isError) return '错误';
    if (isInterrupted) return '中断';
    if (isPending) return '等待中';
    if (isStreaming) return '输入中';
    return '';
  };
  
  const shouldShowMeta = message.timestamp || 
                        getStatusText() || 
                        (!isThinking && (message.tokensUsed !== undefined || message.estimatedTokens));
  
  if (!shouldShowMeta) return null;
  
  return (
    <>
      <div
        style={{
          marginTop: '4px',
          fontSize: '11px',
          opacity: 0.6,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* 左侧：时间戳 */}
        <div style={{ textAlign: isUser ? 'right' : 'left' }}>
          {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
        </div>
        
        {/* 右侧：状态和Token */}
        <div
          style={{
            fontSize: '10px',
            color: isUser ? 'rgba(255, 255, 255, 0.7)' : (isError ? 'rgba(140, 140, 140, 0.7)' : 'rgba(255, 255, 255, 0.6)'),
            fontWeight: '500',
            userSelect: 'none',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {/* 状态显示 */}
          {getStatusText() && (
            <span style={{ opacity: 0.8 }}>
              [{getStatusText()}]
            </span>
          )}
          
          {/* Token显示 */}
          {!isThinking && (message.tokensUsed !== undefined || message.estimatedTokens) && (
            <span
              style={{
                opacity: message.estimatedTokens && message.tokensUsed === undefined ? 0.6 : 1,
                fontStyle: message.estimatedTokens && message.tokensUsed === undefined ? 'italic' : 'normal'
              }}
              title={`${
                message.tokensUsed !== undefined
                  ? `消耗了 ${message.tokensUsed} tokens` 
                  : `估算消耗 ${message.estimatedTokens} tokens`
              }`}
            >
              {message.tokensUsed !== undefined ? message.tokensUsed : message.estimatedTokens}
              {message.estimatedTokens && message.tokensUsed === undefined ? '~t' : 't'}
            </span>
          )}
        </div>
      </div>
      
      {/* 计时器显示 - 简化条件，AI消息都显示计时器 */}
      {!isUser && elapsedTime > 0 && (
        <div
          style={{
            position: 'absolute',
            right: '0',
            bottom: '0',
            transform: 'translate(100%, 0)',
            fontSize: '12px',
            padding: '0px 8px',
            lineHeight: 1,
            color: 'rgba(107, 107, 107, 0.7)',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {elapsedTime}s
        </div>
      )}
    </>
  );
};

export default MessageMeta;
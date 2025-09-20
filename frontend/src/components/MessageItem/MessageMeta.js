import React from 'react';
import { formatTokensToK } from '../../utils/tokenFormatter';
import { ThunderboltFilled } from '@ant-design/icons';

const MessageMeta = ({ message, messageState, elapsedTime }) => {
  const { isThinking, isError, isInterrupted, isPending, isStreaming, isUser, isReceived } = messageState;
  
  const getStatusText = () => {
    if (isError) return '错误';
    if (isInterrupted) return '中断';
    if (isPending) return '等待中';
    if (isStreaming) return '输入中';
    if (isThinking) return '思考中';
    return '';
  };
  
  const shouldShowMeta = message.timestamp || 
                        getStatusText() || 
                        (!isThinking && (message.tokensUsed !== undefined));
  
  if (!shouldShowMeta) return null;
  
  // 获取token消耗数据
  const getTokenCount = () => {
    // 如果已收到complete消息（tokensUsed存在），则直接使用tokensUsed
    if (message.tokensUsed !== undefined) {
      // tokensUsed是数字，直接返回
      return message.tokensUsed
    }

    
    // 默认值
    return 1;
  };
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
          
          {/* Token显示 - 修改为k单位 */}
          {!isThinking && (message.tokensUsed !== undefined) && (
            <span>
              <ThunderboltFilled/>{formatTokensToK(getTokenCount())}
            </span>
          )}
        </div>
      </div>
      {/* 计时器显示 - 修改条件，让所有AI消息都显示计时器 */}
      {!isUser && (elapsedTime > 0 || (!isThinking && !isStreaming && !isPending && !isError)) && (
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
          {elapsedTime > 0 ? `${elapsedTime}s` : ''}
        </div>
      )}
    </>
  );
};

export default MessageMeta;
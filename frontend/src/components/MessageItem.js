import React from 'react';
import { useMessageState } from '../hooks/useMessageState';
import { useTypewriterEffect } from '../hooks/useTypewriterEffect';
import { useMessageTimer } from '../hooks/useMessageTimer';
import MessageContent from './MessageItem/MessageContent';
import MessageMeta from './MessageItem/MessageMeta';
import { AssistantAvatar, UserAvatar } from './MessageItem/MessageAvatar';
import { theme } from '../constants/theme';

const MessageItem = ({ message, index }) => {
  // 使用自定义 Hook 管理状态
  const messageState = useMessageState(message);
  const typewriterState = useTypewriterEffect(message, messageState);
  const elapsedTime = useMessageTimer(
    messageState.isThinking, 
    messageState.isError, 
    messageState.isStreaming, 
    message.role
  );
  
  const { isUser, isAssistant, isThinking } = messageState;
  
  // 获取消息容器样式
  const getMessageContainerStyle = () => {
    // 根据消息类型调整最大宽度
    const getMaxWidth = () => {
      if (messageState.messageType === 'image') {
        // 图片消息：小屏幕60%，大屏幕40%
        return window.innerWidth < 768 ? '60%' : '40%';
      }
      // 文本消息：小屏幕85%，大屏幕70%
      return window.innerWidth < 768 ? '85%' : '50%';
    };
    
    return {
      position: 'relative',
      maxWidth: getMaxWidth(),
      padding: '12px 16px',
      borderRadius: '12px',
      backgroundColor: isUser ? theme.userMessage : (isThinking ? theme.thinkingBackground : theme.darkTertiary),
      color: isUser ? '#fff' : (isThinking ? theme.thinking : theme.textPrimary),
      border: isThinking ? `2px dashed ${theme.thinking}` : (isUser ? `1px solid ${theme.userMessageBorder}` : `1px solid ${theme.border}`),
      animation: isThinking ? 'pulse 1.5s infinite' : 'none',
      wordBreak: 'break-word',
      lineHeight: '1.6',
      overflow: 'hidden', // 添加overflow处理
      boxSizing: 'border-box' // 确保padding计算正确
    };
  };
  
  return (
    <div
      style={{
        display: 'flex',
        marginBottom: '24px',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        position: 'relative'
      }}
    >
      {/* AI头像 */}
      {isAssistant && <AssistantAvatar messageState={messageState} />}
      
      {/* 消息内容容器 */}
      <div style={getMessageContainerStyle()}>
        {/* 消息内容 */}
        <div
          style={{
            margin: 0,
            color: isUser ? '#fff' : (isThinking ? '#1890ff' : '#ffffff'),
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <MessageContent 
            message={message} 
            messageState={messageState}
            typewriterState={typewriterState}
          />
        </div>
        
        {/* 元信息显示 */}
        <MessageMeta 
          message={message} 
          messageState={messageState}
          elapsedTime={elapsedTime}
        />
      </div>
      
      {/* 用户头像 */}
      {isUser && <UserAvatar />}
    </div>
  );
};

export default MessageItem;
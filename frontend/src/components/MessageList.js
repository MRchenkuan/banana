import React, { useEffect } from 'react';
import {
  Empty
} from 'antd';
import MessageItem from './MessageItem';

const MessageList = ({ 
  messages, 
  currentSessionId, 
  messagesEndRef 
}) => {
  // 监听会话ID变化，立即滚动到底部
  useEffect(() => {
    if (currentSessionId && messagesEndRef.current) {
      // 会话切换时立即滚动，不播放动画
      setTimeout(() => {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [currentSessionId]);

  return (
    <div style={{ 
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#141414',
      padding: '16px'
    }}>
      {messages.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Empty
            description={currentSessionId ? "开始你的对话吧！" : "选择一个会话或创建新对话"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ color: '#a6a6a6' }}
          />
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <MessageItem 
              key={message.id || index}
              message={message}
              index={index}
            />
          ))}
          
          <div ref={messagesEndRef} style={{ height: '1px' }} />
        </>
      )}
    </div>
  );
};

export default MessageList;
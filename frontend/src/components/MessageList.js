import React, { useEffect, useRef } from 'react';
import { Empty } from 'antd';
import MessageItem from './MessageItem/MessageItem';
import TokenMonitor from './TokenMonitor/TokenMonitor';

const MessageList = ({ 
  messages, 
  currentSessionId, 
  messagesEndRef,
  restoreScrollPosition
}) => {
  const containerRef = useRef(null);
  const isInitialLoad = useRef(true);
  
  // 监听会话ID变化，恢复滚动位置或滚动到底部
  useEffect(() => {
    if (currentSessionId && messagesEndRef.current) {
      if (isInitialLoad.current) {
        // 首次加载，尝试恢复滚动位置
        restoreScrollPosition?.();
        isInitialLoad.current = false;
      } else {
        // 会话切换，滚动到底部
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 50);
      }
    }
  }, [currentSessionId, restoreScrollPosition]);
  
  // 监听消息变化，如果是新消息则滚动到底部
  useEffect(() => {
    if (messages.length > 0 && !isInitialLoad.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length]);
  
  return (
    <>
      {/* 简化版Token监测组件 */}
      <TokenMonitor messages={messages} />
      
      {/* 消息列表容器 */}
      <div 
        ref={containerRef}
        style={{ 
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#141414',
          padding: '0px 16px 60px' // 将padding从'16px'改为'0'
        }}
      >
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
            {messages.map((message, index) => {
              // 生成稳定的key
              const messageKey = message.id || `${message.role}-${message.timestamp || index}`;
              
              return (
                <MessageItem 
                  key={messageKey}
                  message={message}
                  index={index}
                />
              );
            })}
            
            <div ref={messagesEndRef} style={{ height: '1px' }} />
          </>
        )}
      </div>
    </>
  );
};

export default MessageList;
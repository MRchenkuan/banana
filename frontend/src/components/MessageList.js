import React from 'react';
import {
  Card,
  Empty
} from 'antd';
import MessageItem from './MessageItem';

const MessageList = ({ 
  messages, 
  currentSessionId, 
  messagesEndRef 
}) => {
  return (
    <div style={{ 
      flex: 1,
      overflowY: 'scroll',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Card
        styles={{
          body: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#141414'
          }
        }}
        style={{
          border: 'none',
          backgroundColor: '#141414'
        }}
      >
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '20px'
          }}
        >
          {messages.length === 0 ? (
            <Empty
              description={currentSessionId ? "开始你的对话吧！" : "选择一个会话或创建新对话"}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ color: '#a6a6a6' }}
            />
          ) : (
            messages.map((message, index) => (
              <MessageItem 
                key={message.id || index}
                message={message}
                index={index}
              />
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </Card>
    </div>
  );
};

export default MessageList;
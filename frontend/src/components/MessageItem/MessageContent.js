import React from 'react';
import { Image } from 'antd';
import ReactMarkdown from 'react-markdown';
import { optimizeImage } from '../../utils/imageOptimizer';
import { getMarkdownComponents } from './utils/markdownComponents';

const MessageContent = ({ message, messageState, typewriterState }) => {
  const { contentToShow } = typewriterState;
  const { isThinking, isAssistant } = messageState;
  
  // 渲染思考状态
  if (isThinking) {
    return (
      <>
        <span>{contentToShow}</span>
        <span 
          style={{
            display: 'inline-block',
            width: '4px',
            height: '4px',
            backgroundColor: '#1890ff',
            borderRadius: '50%',
            marginLeft: '8px',
            animation: 'pulse 1.5s infinite'
          }}
        />
      </>
    );
  }
  
  // 渲染AI消息（使用Markdown）
  if (isAssistant) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <ReactMarkdown components={getMarkdownComponents()}>
          {contentToShow}
        </ReactMarkdown>
      </div>
    );
  }
  
  // 用户消息默认显示
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {contentToShow}
    </div>
  );
};

export default MessageContent;
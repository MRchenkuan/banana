import React from 'react';
import { Image } from 'antd';
import ReactMarkdown from 'react-markdown';
import { optimizeImage } from '../../utils/imageOptimizer';
import { getMarkdownComponents } from './utils/markdownComponents';

const MessageContent = ({ message, messageState, typewriterState }) => {
  const { contentToShow } = typewriterState;
  const { isThinking, messageType, isAssistant, isUser } = messageState;
  
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
  
  // 渲染图片消息（AI生成的单张图片）
  if (messageType === 'image' && message.imageUrl && isAssistant) {
    return (
      <div style={{ width: '100%' }}>
        <Image
          src={optimizeImage(message.imageUrl, 'chat')}
          alt={message.fileName || "AI生成的图片"}
          style={{
            maxWidth: '100%',
            width: 'auto',
            height: 'auto',
            maxHeight: '300px', // 统一为300px
            borderRadius: '8px',
            marginBottom: message.content ? '8px' : '0',
            display: 'block'
          }}
          preview={{
            mask: '预览图片',
            src: message.imageUrl
          }}
        />
        {message.content && (
          <div style={{ marginTop: '8px' }}>
            {message.content}
          </div>
        )}
        {(message.fileName || message.fileSize) && (
          <div style={{ 
            marginTop: '4px', 
            fontSize: '12px', 
            color: 'rgba(255, 255, 255, 0.6)',
            fontStyle: 'italic'
          }}>
            {message.fileName && <span>{message.fileName}</span>}
            {message.fileSize && (
              <span style={{ marginLeft: message.fileName ? '8px' : '0' }}>
                ({(message.fileSize / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // 渲染用户发送的图片消息（支持多张图片）
  if (messageType === 'image' && message.imageUrls && isUser) {
    return (
      <div style={{ width: '100%' }}>
        {/* 显示用户的文本内容 */}
        {message.content && (
          <div style={{ marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
            {message.content}
          </div>
        )}
        
        {/* 显示用户上传的图片 */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          marginTop: message.content ? '8px' : '0'
        }}>
          {message.imageUrls.map((imageUrl, index) => (
            <Image
              key={index}
              src={imageUrl}
              alt={`用户上传的图片 ${index + 1}`}
              style={{
                maxWidth: message.imageUrls.length === 1 ? '100%' : '48%',
                width: 'auto',
                height: 'auto',
                maxHeight: '300px',
                borderRadius: '8px',
                display: 'block'
              }}
              preview={{
                mask: '预览图片',
                src: imageUrl
              }}
            />
          ))}
        </div>
      </div>
    );
  }
  
  // 渲染文本消息
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
import React from 'react';
import { Image } from 'antd';
import ReactMarkdown from 'react-markdown';
import { optimizeImage } from '../../utils/imageOptimizer';
import { getMarkdownComponents } from './utils/markdownComponents';

const MessageContent = ({ message, messageState, typewriterState }) => {
  const { contentToShow } = typewriterState;
  const { isThinking, isAssistant, isUser } = messageState;
  
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
  
  // 用户消息特殊处理 - 直接渲染图片和文本
  if (isUser) {
    // 检查是否包含 blob URL 图片
    const blobImageRegex = /!\[([^\]]*)\]\((blob:[^)]+)\)/g;
    const matches = [...contentToShow.matchAll(blobImageRegex)];
    
    if (matches.length > 0) {
      // 分离图片和文本
      let textContent = contentToShow;
      const images = [];
      
      matches.forEach((match, index) => {
        const [fullMatch, alt, src] = match;
        images.push({ alt, src, key: index });
        textContent = textContent.replace(fullMatch, '').trim();
      });
      
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          {/* 渲染图片 */}
          {images.map(({ alt, src, key }) => (
            <Image
              key={key}
              src={src}
              alt={alt}
              style={{
                maxWidth: '30vw',
                maxHeight: '40vh', // 只限制图片的最大高度
                height: 'auto',
                borderRadius: '8px',
                margin: '8px 0',
                display: 'block',
                objectFit: 'contain'
              }}
              preview={{
                mask: '预览图片'
              }}
            />
          ))}
          {/* 渲染文本 */}
          {textContent && (
            <div style={{ marginTop: images.length > 0 ? '8px' : '0' }}>
              {textContent}
            </div>
          )}
        </div>
      );
    }
    
    // 没有图片的用户消息，正常渲染
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <ReactMarkdown components={getMarkdownComponents()}>
          {contentToShow}
        </ReactMarkdown>
      </div>
    );
  }
  
  // AI消息使用markdown渲染
  if (isAssistant) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <ReactMarkdown components={getMarkdownComponents()}>
          {contentToShow}
        </ReactMarkdown>
      </div>
    );
  }
  
  // 默认显示
  return (
    <div style={{ whiteSpace: 'pre-wrap' }}>
      {contentToShow}
    </div>
  );
};

export default MessageContent;
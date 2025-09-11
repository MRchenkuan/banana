import React from 'react';
import { Image } from 'antd';
import ReactMarkdown from 'react-markdown';
import { optimizeImage } from '../../utils/imageOptimizer';
import { getMarkdownComponents } from './utils/markdownComponents';
import { createImageDragHandler, getDragImageStyle } from '../../utils/imageDragUtils';

const MessageContent = ({ message, messageState, typewriterState }) => {
  const { contentToShow } = typewriterState;
  const { isThinking, isAssistant, isUser } = messageState;
  
  // 思考状态直接显示内容，使用与助手消息相同的样式
  if (isThinking) {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <span>{contentToShow}</span>
      </div>
    );
  }
  
  // 用户消息特殊处理 - 直接渲染图片和文本
  if (isUser) {
    // 检查是否包含图片链接（blob URL 或 http/https URL）
    const imageRegex = /!\[([^\]]*)\]\(((?:blob:|https?:)[^)]+)\)/g;
    const matches = [...contentToShow.matchAll(imageRegex)];
    
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
          {images.map((imageData, index) => {
            // 使用稳定的key
            const imageKey = `${imageData.src}-${index}`;
            
            return (
              <Image
                key={imageKey}  // 使用稳定的key
                src={imageData.src}
                alt={`图片 ${index + 1}`}
                style={{
                  maxWidth: '30vw',
                  maxHeight: '40vh',
                  height: 'auto',
                  borderRadius: '8px',
                  margin: '8px 0',
                  display: 'block',
                  objectFit: 'contain',
                  ...getDragImageStyle() // 使用工具函数获取拖拽样式
                }}
                preview={{
                  mask: false
                }}
                draggable={true}
                onDragStart={createImageDragHandler(imageData.src)} // 修复：使用 imageData.src 而不是 src
                onError={(e) => {
                  console.error('Image load error:', e);
                  console.error('Failed src:', imageData.src); // 修复：使用 imageData.src 而不是 src
                  // 不显示错误消息，避免用户体验问题
                }}
                fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJh+WKoOi9veWksei0pTwvdGV4dD48L3N2Zz4="
              />
            );
          })}
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
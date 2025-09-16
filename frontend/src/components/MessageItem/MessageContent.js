import React from 'react';
import { Image, Button } from 'antd';
import { RetweetOutlined, PlusCircleOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { optimizeImage } from '../../utils/imageOptimizer';
import { getMarkdownComponents } from './utils/markdownComponents';
import { createImageDragHandler, getDragImageStyle } from '../../utils/imageDragUtils';
import styles from './MessageContent.module.css';

const MessageContent = ({ message, messageState, typewriterState, onReuploadImage }) => {
  const { contentToShow, isTyping } = typewriterState;
  const { isThinking, isAssistant, isUser, isStreaming } = messageState;
  
  // 判断是否应该显示呼吸灯
  const shouldShowBreathingDot = isAssistant && (isStreaming || isTyping) && !isThinking;
  
  // 思考状态直接显示内容，使用与助手消息相同的样式
  if (isThinking) {
    return (
      <div className={styles.messageContent}>
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
        <div className={styles.messageContent}>
          {/* 渲染图片 */}
          {images.map((imageData, index) => {
            // 使用稳定的key
            const imageKey = `${imageData.src}-${index}`;
            
            return (
              <div key={imageKey} className={styles.imageContainer}>
                <Image
                  src={imageData.src}
                  alt={`图片 ${index + 1}`}
                  className={styles.messageImage}
                  style={{
                    ...getDragImageStyle()
                  }}
                  preview={{
                    mask: false
                  }}
                  draggable={true}
                  onDragStart={createImageDragHandler(imageData.src)}
                  onError={(e) => {
                    console.error('Image load error:', e);
                    console.error('Failed src:', imageData.src);
                  }}
                  fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIz..."
                />
                {/* 添加重新上传按钮 */}
                <Button
                  type="text"
                  size="small"
                  icon={<PlusCircleOutlined className={styles.reuploadIcon} />}
                  onClick={() => onReuploadImage && onReuploadImage(imageData.src)}
                  className={styles.reuploadButton}
                  title="重新上传"
                />
              </div>
            );
          })}
          {/* 渲染文本 */}
          {textContent && (
            <div className={images.length > 0 ? styles.textContainerWithImages : styles.textContainerNoImages}>
              {textContent}
            </div>
          )}
        </div>
      );
    }
    
    // 没有图片的用户消息，正常渲染
    return (
      <div className={styles.messageContent}>
        <ReactMarkdown components={getMarkdownComponents(onReuploadImage)}>
          {contentToShow}
        </ReactMarkdown>
      </div>
    );
  }
  
  // AI消息使用markdown渲染，并在流式输出时添加呼吸灯
  if (isAssistant) {
    return (
      <div className={styles.messageContent}>
        <ReactMarkdown components={getMarkdownComponents(onReuploadImage)}>
          {contentToShow}
        </ReactMarkdown>
        {shouldShowBreathingDot && (
          <span className={styles.breathingDot}></span>
        )}
      </div>
    );
  }
  
  // 默认显示
  return (
    <div className={styles.defaultContent}>
      {contentToShow}
      {shouldShowBreathingDot && (
        <span className={styles.breathingDot}></span>
      )}
    </div>
  );
};

export default MessageContent;
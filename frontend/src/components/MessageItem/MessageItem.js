import React, { memo, useContext } from 'react';
import { message as antMessage, Button } from 'antd';
import { RetweetOutlined } from '@ant-design/icons';
import { useMessageState } from '../../hooks/useMessageState';
import { useTypewriterEffect } from '../../hooks/useTypewriterEffect';
import { useMessageTimer } from '../../hooks/useMessageTimer';
import MessageContent from './MessageContent';
import MessageMeta from './MessageMeta';
import { AssistantAvatar, UserAvatar } from './MessageAvatar';
import { theme } from '../../constants/theme';
import { ChatContext } from '../../contexts/ChatContext';
import styles from './MessageItem.module.css';

const MessageItem = memo(({ message, index }) => {
  const { setSelectedImages, setInputValue } = useContext(ChatContext);
  
  const messageState = useMessageState(message);
  const typewriterState = useTypewriterEffect(message, messageState);
  const elapsedTime = useMessageTimer(
    messageState.isThinking, 
    messageState.isError, 
    messageState.isStreaming, 
    message.role
  );
  
  const { isUser, isAssistant, isThinking } = messageState;
  
  const handleReuploadImage = async (imageSrc, fromRegenerate = false) => {
    try {
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      const extension = blob.type.split('/')[1] || 'png';
      const fileName = `reupload-${Date.now()}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type });
      
      setSelectedImages(prev => {
        if (fromRegenerate) {
          return [file];
        }
        
        if (prev.length >= 3) {
          antMessage.warning('最多只能上传3张图片，请先清除现有图片');
          return prev;
        }
        return [...prev, file];
      });
      
      antMessage.success('图片已添加到上传区域');
    } catch (error) {
      console.error('重新上传图片失败:', error);
      antMessage.error('重新上传图片失败，请重试');
    }
  };
  
  const handleRegenerate = () => {
    if (!isUser || !message.content) return;
    
    try {
      let textContent = message.content;
      const imageRegex = /!\[([^\]]*)\]\(((?:blob:|https?:)[^)]+)\)/g;
      const matches = [...textContent.matchAll(imageRegex)];
      
      if (matches.length > 0) {
        matches.forEach(match => {
          const [fullMatch, alt, src] = match;
          textContent = textContent.replace(fullMatch, '').trim();
          
          handleReuploadImage(src, true).catch(err => {
            console.error('重新上传图片失败:', err);
          });
        });
      }
      
      setInputValue(textContent.trim());
      antMessage.success('已将内容添加到输入框');
    } catch (error) {
      console.error('重新生成失败:', error);
      antMessage.error('重新生成失败，请重试');
    }
  };
  
  // 获取消息容器的CSS类名
  const getMessageContainerClasses = () => {
    const classes = [styles.messageContainer];
    
    if (isUser) {
      classes.push(styles.messageContainerUser);
    }
    
    // 根据消息类型添加对应的类名
    if (messageState.messageType === 'image') {
      classes.push(isUser ? styles.messageContainerImageUser : styles.messageContainerImageAssistant);
    } else {
      classes.push(isUser ? styles.messageContainerTextUser : styles.messageContainerTextAssistant);
    }
    
    return classes.join(' ');
  };
  
  // 获取消息容器的内联样式（主题相关）
  const getMessageContainerStyle = () => {
    return {
      backgroundColor: isUser ? theme.userMessage : theme.darkTertiary,
      border: isUser ? `1px solid ${theme.userMessageBorder}` : `1px solid ${theme.border}`,
      color: isUser ? '#fff' : theme.textPrimary
    };
  };
  
  return (
    <div className={`${styles.messageWrapper} ${isUser ? styles.messageWrapperUser : styles.messageWrapperAssistant}`}>
      {isAssistant && <AssistantAvatar messageState={messageState} />}
      
      <div 
        className={getMessageContainerClasses()}
        style={getMessageContainerStyle()}
      >
        <div className={styles.messageContent}>
          <MessageContent 
            message={message} 
            messageState={messageState}
            typewriterState={typewriterState}
            onReuploadImage={handleReuploadImage}
          />
        </div>
        
        <MessageMeta 
          message={message} 
          messageState={messageState}
          elapsedTime={elapsedTime}
        />
        
        {isUser && (
          <Button
            type="text"
            size="small"
            icon={<RetweetOutlined className={styles.regenerateIcon} />}
            onClick={handleRegenerate}
            className={styles.regenerateButton}
            title="重新生成"
          />
        )}
      </div>
      
      {isUser && <UserAvatar />}
    </div>
  );
});

export default MessageItem;
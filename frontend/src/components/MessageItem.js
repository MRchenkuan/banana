import React, { memo, useContext } from 'react';
import { message as antMessage, Button } from 'antd'; // 添加Button导入
import { RetweetOutlined } from '@ant-design/icons'; // 添加图标导入
import { useMessageState } from '../hooks/useMessageState';
import { useTypewriterEffect } from '../hooks/useTypewriterEffect';
import { useMessageTimer } from '../hooks/useMessageTimer';
import MessageContent from './MessageItem/MessageContent';
import MessageMeta from './MessageItem/MessageMeta';
import { AssistantAvatar, UserAvatar } from './MessageItem/MessageAvatar';
import { theme } from '../constants/theme';
import { ChatContext } from '../contexts/ChatContext';

const MessageItem = memo(({ message, index }) => {
  // 使用ChatContext获取setSelectedImages和setInputValue函数
  const { setSelectedImages, setInputValue } = useContext(ChatContext);
  
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
  
  // 处理图片重新上传
  const handleReuploadImage = async (imageSrc, fromRegenerate = false) => {
    try {
      // 从URL获取图片数据
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`获取图片失败: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // 创建File对象
      const extension = blob.type.split('/')[1] || 'png';
      const fileName = `reupload-${Date.now()}.${extension}`;
      const file = new File([blob], fileName, { type: blob.type });
      
      // 添加到上传区域
      setSelectedImages(prev => {
        // 如果是从重新生成按钮来的，则先清空已有图片
        if (fromRegenerate) {
          return [file];
        }
        
        // 普通上传，检查数量限制
        if (prev.length >= 2) {
          antMessage.warning('最多只能上传2张图片，请先清除现有图片');
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
  
  // 添加重新生成功能
  const handleRegenerate = () => {
    if (!isUser || !message.content) return;
    
    try {
      // 设置输入框内容为用户消息文本
      // 提取纯文本内容（去除图片标记）
      let textContent = message.content;
      const imageRegex = /!\[([^\]]*)\]\(((?:blob:|https?:)[^)]+)\)/g;
      const matches = [...textContent.matchAll(imageRegex)];
      
      // 处理图片
      if (matches.length > 0) {
        // 清除所有图片标记，获取纯文本
        matches.forEach(match => {
          const [fullMatch, alt, src] = match;
          textContent = textContent.replace(fullMatch, '').trim();
          
          // 异步处理图片上传，传入fromRegenerate=true
          handleReuploadImage(src, true).catch(err => {
            console.error('重新上传图片失败:', err);
          });
        });
      }
      
      // 设置输入框内容
      setInputValue(textContent.trim());
      antMessage.success('已将内容添加到输入框');
    } catch (error) {
      console.error('重新生成失败:', error);
      antMessage.error('重新生成失败，请重试');
    }
  };
  
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
      backgroundColor: isUser ? theme.userMessage : theme.darkTertiary,
      color: isUser ? '#fff' : theme.textPrimary,
      border: isUser ? `1px solid ${theme.userMessageBorder}` : `1px solid ${theme.border}`,
      wordBreak: 'break-word',
      lineHeight: '1.6',
      overflow: 'visible', // 修改为 visible 以显示计时器
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
            color: isUser ? '#fff' : '#ffffff',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <MessageContent 
            message={message} 
            messageState={messageState}
            typewriterState={typewriterState}
            onReuploadImage={handleReuploadImage} // 传递重新上传函数
          />
        </div>
        
        {/* 元信息显示 */}
        <MessageMeta 
          message={message} 
          messageState={messageState}
          elapsedTime={elapsedTime}
        />
        
        {/* 用户消息添加重新生成按钮 */}
        {isUser && (
          <Button
            type="text"
            size="small"
            icon={<RetweetOutlined style={{ color: 'rgba(24, 144, 255, 0.85)' }} />}
            onClick={handleRegenerate}
            style={{
              position: 'absolute',
              bottom: '-12px',
              right: '12px',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)', // Safari 支持
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
              transition: 'all 0.3s ease'
            }}
            title="重新生成"
            className="regenerate-button"
          />
        )}
      </div>
      
      {/* 用户头像 */}
      {isUser && <UserAvatar />}
    </div>
  );
});

export default MessageItem;
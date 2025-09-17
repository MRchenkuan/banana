import React, { useState, useEffect } from "react";
import { message } from "antd";
import SessionSidebar from "../components/SessionSidebar";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput/MessageInput";
import useChat from "../hooks/useChat";
import useSessions from "../hooks/useSessions";
import useMessageSender from "../hooks/useMessageSender";
import useImageHandler from "../hooks/useImageHandler";
import { compressImages } from "../utils/imageCompression";
import { ChatProvider } from '../contexts/ChatContext';

const Chat = () => {
  const [inputValue, setInputValue] = useState("");

  // 使用自定义hooks
  const {
    messages,
    setMessages,
    loading,
    setLoading,
    currentSessionId,
    setCurrentSessionId,
    messagesEndRef,
    scrollToBottom,
    restoreScrollPosition,
    updateBalance,
    clearCurrentSessionCache,
    validateAndCleanSession,
    clearCurrentSessionFromStorage // 新增
  } = useChat();
  
  // 先初始化 sessions
  const { sessions, setSessions, sessionsLoading } = useSessions();
  
  // 然后使用 sessions 初始化 useMessageSender
  const { handleSendMessage } = useMessageSender({
    loading,
    setLoading,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    setSessions,
    setMessages,
    updateBalance,
    clearCurrentSessionCache,
    validateAndCleanSession
  });

  const {
    selectedImages,
    setSelectedImages,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToolbarImageUpload,
  } = useImageHandler();

  // 滚动效果
  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // 新的会话验证逻辑：刷新时根据session列表状态决定保留或清理ID
  useEffect(() => {
    if (!sessionsLoading) {
      if (sessions.length === 0) {
        // 规则3：当列表被刷新时，如果没有任何聊天，则清理当前ID
        if (currentSessionId) {
          console.log('📝 会话列表为空，清理当前会话ID:', currentSessionId);
          clearCurrentSessionFromStorage();
          setCurrentSessionId(null);
          setMessages([]);
        }
      } else if (currentSessionId) {
        // 刷新时，检查当前ID是否包含在session列表中
        const sessionExists = sessions.some(session => String(session.id) === String(currentSessionId));
        
        if (sessionExists) {
          // 如果包含，则选中这个session（由于逻辑1，会自动储存ID）
          console.log('✅ 当前会话ID存在于列表中，保持选中:', currentSessionId);
          // 这里不需要额外操作，因为setCurrentSessionId会自动保存到localStorage
        } else {
          // 如果不包含就直接清理掉当前ID
          console.warn('⚠️ 当前会话不存在于列表中，清理会话ID:', currentSessionId);
          clearCurrentSessionFromStorage();
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    }
  }, [sessions, currentSessionId, sessionsLoading, clearCurrentSessionFromStorage, setCurrentSessionId, setMessages]);

  // 会话切换处理
  const handleSessionSwitch = (sessionId, newMessages = null) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
    }
  };

  // 专门的粘贴处理函数
  const handlePasteImages = async (imageFiles) => {
    try {
      if (imageFiles.length === 0) return;
      
      const totalImages = selectedImages.length + imageFiles.length;
      if (totalImages > 2) {
        message.warning('最多只能上传2张图片');
        return;
      }
      
      const needCompression = imageFiles.some(file => file.size > 500 * 1024);
      
      if (needCompression) {
        try {
          message.loading('正在压缩图片...', 0);
          const compressedFiles = await compressImages(imageFiles, 500);
          setSelectedImages(prev => [...prev, ...compressedFiles]);
          message.destroy();
          message.success('图片粘贴成功');
        } catch (error) {
          message.destroy();
          message.error('图片压缩失败');
          console.error('压缩失败:', error);
        }
      } else {
        setSelectedImages(prev => [...prev, ...imageFiles]);
        message.success('图片粘贴成功');
      }
    } catch (error) {
      console.error('粘贴图片失败:', error);
      message.error('粘贴图片失败，请重试');
    }
  };
  
  // 改进的键盘事件处理
  const handleKeyPress = async (e) => {
    // 只处理 Ctrl+V 或 Cmd+V 的图片粘贴，不阻止文本粘贴
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      // 不再无条件阻止默认行为
      
      try {
        // 检查浏览器是否支持 clipboard API
        if (navigator.clipboard && navigator.clipboard.read) {
          try {
            const clipboardItems = await navigator.clipboard.read();
            const imageFiles = [];
            let hasImageType = false;
            
            for (const clipboardItem of clipboardItems) {
              for (const type of clipboardItem.types) {
                if (type.startsWith('image/')) {
                  hasImageType = true;
                  const blob = await clipboardItem.getType(type);
                  const file = new File([blob], `pasted-image-${Date.now()}.${type.split('/')[1]}`, {
                    type: type,
                    lastModified: Date.now()
                  });
                  imageFiles.push(file);
                }
              }
            }
            
            // 只有在检测到图片时才阻止默认行为
            if (hasImageType) {
              e.preventDefault();
              
              if (imageFiles.length > 0) {
                await handlePasteImages(imageFiles);
              } else {
                message.info('剪贴板中没有图片数据');
              }
            }
            // 如果没有图片，让浏览器执行默认的文本粘贴行为
          } catch (clipboardError) {
            // 如果是权限错误，静默处理，让默认粘贴行为继续
            if (clipboardError.name === 'NotAllowedError') {
              console.log('剪贴板权限未授予，使用默认粘贴行为');
              // 不显示错误提示，让默认粘贴行为继续
            } else {
              // 其他错误也静默处理，让默认粘贴行为继续
              console.error('读取剪贴板失败:', clipboardError);
            }
          }
        }
        // 如果浏览器不支持 clipboard API，不显示警告，让默认粘贴行为继续
      } catch (error) {
        // 捕获任何其他错误，但不显示错误提示
        console.error('粘贴处理失败:', error);
      }
      // 不返回，让事件继续传播
    }
    
    // Enter 键发送消息逻辑
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // 检查是否有内容可发送
      if (inputValue.trim() || selectedImages.length > 0) {
        handleSendMessage(
          inputValue,
          selectedImages,
          setInputValue,
          setSelectedImages
        );
      }
    }
  };

  // 工具点击处理
  const handleToolClick = (toolKey) => {
    // 工具处理逻辑
  };

  const onSendMessage = () => {
    // 检查是否有内容可发送
    if (inputValue.trim() || selectedImages.length > 0) {
      handleSendMessage(
        inputValue,
        selectedImages,
        setInputValue,
        setSelectedImages
      );
    } else {
      message.warning('请输入消息内容或选择图片');
    }
  };

  // 创建ChatContext的值
  const chatContextValue = {
    setSelectedImages,
    setInputValue
  };
  
  return (
    <ChatProvider value={chatContextValue}>
      <div
        className="chat-container"
        style={{
          height: 'calc(100vh - 75px)',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1a1a1a'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* 会话侧边栏 */}
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSwitch={handleSessionSwitch}
          loading={sessionsLoading}
        />
        
        {/* 主聊天区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 消息列表 */}
          <MessageList
            messages={messages}
            currentSessionId={currentSessionId}
            messagesEndRef={messagesEndRef}
            restoreScrollPosition={restoreScrollPosition}
          />
          
          {/* 消息输入框 */}
          <MessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            loading={loading}
            isDragOver={isDragOver}
            onSendMessage={onSendMessage}
            onKeyPress={handleKeyPress}
            // 移除这三行，避免重复处理
            // onDragOver={handleDragOver}
            // onDragLeave={handleDragLeave}
            // onDrop={handleDrop}
            onPaste={handlePasteImages}
            onToolClick={handleToolClick}
            onImageUpload={handleToolbarImageUpload}
          />
        </div>
      </div>
    </ChatProvider>
  );
};

export default Chat;

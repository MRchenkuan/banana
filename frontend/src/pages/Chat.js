import React, { useState, useEffect, useRef } from "react";
import { message } from "antd";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput/MessageInput";
import AnnouncementHUD from "../components/AnnouncementHUD";
import useSessionsStore from "../hooks/useSessionsStore"; 
import useMessageSender from "../hooks/useMessageSender";
import useImageHandler from "../hooks/useImageHandler";
import { compressImages } from "../utils/imageCompression";
import { ChatContext, useChatContext } from '../contexts/ChatContext';

const Chat = () => {
  const [inputValue, setInputValue] = useState("");

  // 使用 useChatContext 替代 useChat
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
    clearCurrentSessionFromStorage,
    loadSessionMessages // 确保这个方法可用
  } = useChatContext();
  
  // 使用 useSessionsStore 替代 useSessions
  const { sessions, setSessions, sessionsLoading, hasLoaded, addSession } = useSessionsStore();
  
  const { handleSendMessage, isCreatingSession } = useMessageSender({
    addSession,
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

  // session 列表和 chat 状态刷新逻辑
  useEffect(() => {
    if(sessionsLoading || !hasLoaded || isCreatingSession) return; // 添加 isCreatingSession 判断
  
    if(!currentSessionId) return;
  
    if (sessions.length === 0) {
      console.log('📝 会话列表为空，清理当前会话ID:', currentSessionId);
      clearCurrentSessionFromStorage();
      setCurrentSessionId(null);
      setMessages([]);
      return;
    } 
  
    // 添加延迟检查，避免在创建会话过程中误清理
    const sessionExists = sessions.some(session => String(session.id) === String(currentSessionId));
    if (!sessionExists) {
      // 如果不包含就直接清理掉当前ID
      console.warn('⚠️ 当前会话不存在于列表中，清理会话ID:', currentSessionId);
      
      // 再次检查会话是否存在
      const sessionExistsAfterDelay = sessions.some(session => String(session.id) === String(currentSessionId));
      if (!sessionExistsAfterDelay) {
        clearCurrentSessionFromStorage();
        setCurrentSessionId(null);
        setMessages([]);
      }
    }    
  }, [sessions, currentSessionId, sessionsLoading, hasLoaded, isCreatingSession, clearCurrentSessionFromStorage, setCurrentSessionId, setMessages]);

  // 修改 Chat.js 中的 useEffect，移除嵌套的 useEffect
  // 在第97行附近
  
  // 添加会话切换后的消息加载逻辑
  useEffect(() => {
    // 只有当会话ID存在且不是临时会话时才加载消息
    if (currentSessionId && !String(currentSessionId).startsWith('temp-')) {
      console.log(`准备加载会话 ${currentSessionId} 的消息`);
      
      // 直接加载消息，不使用缓存
      loadSessionMessages(currentSessionId)
        .catch(error => {
          console.error(`加载会话 ${currentSessionId} 的消息失败:`, error);
          // 只有在非401错误时显示错误消息
          if (error.response?.status !== 401) {
            message.error('加载会话消息失败');
          }
        });
    }
  }, [currentSessionId, loadSessionMessages]);
  
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
      // 检查是否正在进行中文输入
      if (e.isComposing || e.keyCode === 229) {
        // 正在输入中文，不做任何处理，让浏览器完成输入
        return;
      }
      
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

  // 修改 Chat.js 中的 ChatProvider 使用方式
  // 将第 241-247 行修改为：
  
    // 创建ChatContext的值
    const chatContextValue = {
      setSelectedImages,
      setInputValue,
      // 添加其他可能需要的值
      messages,
      loading,
      currentSessionId
    };
    
    return (
      <ChatContext.Provider value={chatContextValue}>
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
        {/* 公告HUD组件 */}
        <AnnouncementHUD />
        
        
        {/* 主聊天区域 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',backgroundColor: 'rgb(20, 20, 20)' }}>
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
            onPaste={handlePasteImages}
            onToolClick={handleToolClick}
            onImageUpload={handleToolbarImageUpload}
          />
        </div>
      </div>
    </ChatContext.Provider>
  );
};

export default Chat;

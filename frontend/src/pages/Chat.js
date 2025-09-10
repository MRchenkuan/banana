import React, { useState, useEffect } from "react";
import { message } from "antd"; // 添加这行
import SessionSidebar from "../components/SessionSidebar";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import AIToolbar from "../components/AIToolbar";
import useChat from "../hooks/useChat";
import useSessions from "../hooks/useSessions";
import useMessageSender from "../hooks/useMessageSender";
import useImageHandler from "../hooks/useImageHandler";
import { compressImages } from "../utils/imageCompression"; // 添加这行

// 改进键盘事件处理和添加专门的粘贴处理器
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
    loadSessionMessages,
    scrollToBottom,
    restoreScrollPosition, // 新增
    updateBalance,
  } = useChat();

  const { sessions, setSessions, sessionsLoading } = useSessions();

  const {
    selectedImages,
    setSelectedImages,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToolbarImageUpload,
  } = useImageHandler();

  const { handleSendMessage } = useMessageSender({
    loading,
    setLoading,
    currentSessionId,
    setCurrentSessionId,
    sessions,
    setSessions,
    setMessages,
    updateBalance,
  });

  // 滚动效果
  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // 验证当前会话ID是否在会话列表中存在
  useEffect(() => {
    // 只在会话列表加载完成且不为空时才进行验证
    if (currentSessionId && sessions.length > 0 && !sessionsLoading) {
      // 确保类型一致性：将两边都转换为字符串进行比较
      const sessionExists = sessions.some(session => String(session.id) === String(currentSessionId));
      
      if (!sessionExists) {
        // 如果当前会话ID不存在于会话列表中，清除它
        console.warn('⚠️ 当前会话不存在，清除会话ID:', currentSessionId);
        setCurrentSessionId(null);
        setMessages([]);
      }
    }
  }, [sessions, currentSessionId, sessionsLoading]);

  // 会话切换处理 - 简化逻辑
  const handleSessionSwitch = (sessionId, newMessages = null) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
      // 移除手动设置消息的逻辑，让缓存系统处理
    }
  };

  // 专门的粘贴处理函数
  const handlePasteImages = async (imageFiles) => {
    try {
      if (imageFiles.length === 0) return;
      
      // 检查当前已选择的图片数量
      const totalImages = selectedImages.length + imageFiles.length;
      if (totalImages > 2) {
        message.warning('最多只能上传2张图片');
        return;
      }
      
      // 检查是否需要压缩
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
  
  // 改进的键盘事件处理（保留作为备用方案）
  const handleKeyPress = async (e) => {
    // 处理 Ctrl+V 粘贴图片（备用方案）
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      try {
        // 尝试使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.read) {
          const clipboardItems = await navigator.clipboard.read();
          const imageFiles = [];
          
          for (const clipboardItem of clipboardItems) {
            for (const type of clipboardItem.types) {
              if (type.startsWith('image/')) {
                const blob = await clipboardItem.getType(type);
                const file = new File([blob], `pasted-image-${Date.now()}.${type.split('/')[1]}`, {
                  type: type,
                  lastModified: Date.now()
                });
                imageFiles.push(file);
              }
            }
          }
          
          if (imageFiles.length > 0) {
            await handlePasteImages(imageFiles);
          } else {
            message.info('剪贴板中没有图片数据');
          }
        } else {
          message.warning('您的浏览器不支持剪贴板图片粘贴功能');
        }
      } catch (error) {
        console.error('粘贴图片失败:', error);
        if (error.name === 'NotAllowedError') {
          message.error('请允许浏览器访问剪贴板权限');
        } else {
          message.error('粘贴图片失败，请重试或使用拖拽上传');
        }
      }
      return;
    }
    
    // 原有的 Enter 键发送消息逻辑
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(
        inputValue,
        selectedImages,
        setInputValue,
        setSelectedImages
      );
    }
  };

  // 工具点击处理
  const handleToolClick = (toolKey) => {
    // 工具处理逻辑
  };

  const onSendMessage = () => {
    
    handleSendMessage(
      inputValue,
      selectedImages,
      setInputValue,
      setSelectedImages
    );
  };

  return (
    <div style={{ display: "flex", backgroundColor: "#141414" }}>
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        sessionsLoading={sessionsLoading}
        onSessionSwitch={handleSessionSwitch}
        onSessionsUpdate={setSessions}
      />

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 70px)",
        overflow: "hidden",
      }}>
        <div style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}>
          <MessageList
            messages={messages}
            loading={loading}
            currentSessionId={currentSessionId}
            messagesEndRef={messagesEndRef}
            restoreScrollPosition={restoreScrollPosition} // 新增
          />
        </div>

        <div
          style={{
            flexShrink: 0,
            position: "relative",
          }}
        >
          <AIToolbar
            onToolClick={handleToolClick}
            selectedImages={selectedImages}
            setInputValue={setInputValue}
            inputValue={inputValue}
            onImageUpload={handleToolbarImageUpload}
          />

          <MessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            loading={loading}
            isDragOver={isDragOver}
            onSendMessage={onSendMessage}
            onKeyPress={handleKeyPress}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePasteImages} // 添加粘贴事件处理器
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;

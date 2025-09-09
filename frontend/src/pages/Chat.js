import React, { useState, useEffect } from "react";
import SessionSidebar from "../components/SessionSidebar";
import MessageList from "../components/MessageList";
import MessageInput from "../components/MessageInput";
import AIToolbar from "../components/AIToolbar";
import useChat from "../hooks/useChat";
import useSessions from "../hooks/useSessions";
import useMessageSender from "../hooks/useMessageSender";
import useImageHandler from "../hooks/useImageHandler";

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

  // 键盘事件处理
  const handleKeyPress = (e) => {
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
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;

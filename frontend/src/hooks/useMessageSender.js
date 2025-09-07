import { message } from 'antd';
import api from '../services/api';

const useMessageSender = ({
  loading,
  setLoading,
  currentSessionId,
  setCurrentSessionId,
  sessions,
  setSessions,
  setMessages,
  updateBalance
}) => {
  const sendTextMessage = async (messageText, sessionId) => {
    const newMessage = {
      id: Date.now(),
      type: 'text',
      content: messageText,
      timestamp: new Date(),
      role: 'user'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 创建思考中的临时消息
    const thinkingMessageId = Date.now() + 1;
    const thinkingMessage = {
      id: thinkingMessageId,
      type: 'thinking',
      content: '正在思考中...',
      timestamp: new Date(),
      role: 'assistant',
      isThinking: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    await api.chat.sendTextMessage(
      messageText,
      sessionId,
      {
        setMessages,
        updateBalance,
        setSessions,
        thinkingMessageId,
        messageId: thinkingMessageId + 1,
        sessionId,
        setLoading  // 添加这一行
      }
    );
  };

  const sendImageMessage = async (messageText, image, sessionId) => {
    // 创建用户消息（包含图片和文本）
    const newMessage = {
      id: Date.now(),
      type: 'image',
      content: messageText,
      imageUrl: URL.createObjectURL(image),
      timestamp: new Date(),
      role: 'user'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 创建思考中的临时消息
    const thinkingMessageId = Date.now() + 1;
    const thinkingMessage = {
      id: thinkingMessageId,
      type: 'thinking',
      content: '正在分析图片...',
      timestamp: new Date(),
      role: 'assistant',
      isThinking: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    // 使用流式图片API
    await api.chat.sendImageMessage(
      messageText,
      image,
      sessionId,
      // onChunk
      (chunk, estimatedTokens) => {
        setMessages((prev) => {
          const filteredMessages = prev.filter(
            (msg) => msg.id !== thinkingMessageId
          );
    
          const aiMessageId = thinkingMessageId + 1;
          const existingAiMessage = filteredMessages.find(
            (msg) => msg.id === aiMessageId
          );
    
          if (existingAiMessage) {
            return filteredMessages.map((msg) =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    content: msg.content + chunk,
                    estimatedTokens: estimatedTokens,
                  }
                : msg
            );
          } else {
            const aiMessage = {
              id: aiMessageId,
              type: "text",
              content: chunk,
              timestamp: new Date(),
              role: "assistant",
              isStreaming: true,
              isNewMessage: true,
              estimatedTokens: estimatedTokens,
            };
            return [...filteredMessages, aiMessage];
          }
        });
      },
      // onComplete
      async (data) => {
        const aiMessageId = thinkingMessageId + 1;
        setMessages((prev) => {
          const filteredMessages = prev.filter(
            (msg) => msg.id !== thinkingMessageId
          );
          return filteredMessages.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  tokensUsed: data.tokensUsed,
                  estimatedTokens: undefined,
                }
              : msg
          );
        });
        updateBalance(data.remainingBalance);
    
        // 更新会话信息
        setSessions((prev) =>
          prev.map((session) =>
            session.id === sessionId
              ? {
                  ...session,
                  messageCount: (session.messageCount || 0) + 1,
                  lastMessageAt: new Date().toISOString(),
                }
              : session
          )
        );
    
        setLoading(false);
      },
      // onError
      (error) => {
        message.error(error);
        setMessages((prev) => {
          const filteredMessages = prev.filter(
            (msg) => msg.id !== thinkingMessageId
          );
    
          const errorMessage = {
            id: thinkingMessageId + 1,
            type: "error",
            content: "图片分析失败，请稍后重试。",
            timestamp: new Date(),
            role: "assistant",
            isError: true,
            tokensUsed: 0,
          };
    
          return [...filteredMessages, errorMessage];
        });
    
        setLoading(false);
      }
    );
  };

  const handleSendMessage = async (inputValue, selectedImages, setInputValue, setSelectedImages) => {
    if (loading) {
      return;
    }
    
    if (selectedImages.length > 0 && !inputValue.trim()) {
      message.warning('请输入对图片的分析要求或描述');
      return;
    }
    
    if (!inputValue.trim() && selectedImages.length === 0) {
      return;
    }

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        
        // 将 api.createSession() 改为 api.session.createSession()
        const response = await api.session.createSession();
        sessionId = response.data.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [response.data, ...prev]);
      } catch (error) {
        message.error('创建会话失败');
        return;
      }
    }
  
    const messageText = inputValue.trim();
    const images = [...selectedImages];
    
    setInputValue('');
    setSelectedImages([]);
    setLoading(true);
  
    try {
      if (images.length > 0) {
        await sendImageMessage(messageText, images[0], sessionId);
      } else {
        await sendTextMessage(messageText, sessionId);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error(error.response?.data?.error || '发送消息失败，请重试');
      setLoading(false);
    }
  };

  return {
    handleSendMessage,
    sendTextMessage,
    sendImageMessage
  };
};

export default useMessageSender;
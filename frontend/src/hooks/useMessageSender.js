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

  const sendImageMessage = async (messageText, images, sessionId) => {
    // 创建用户消息（包含多张图片）
    const imageUrls = images.map(img => URL.createObjectURL(img));
    
    const newMessage = {
      id: Date.now(),
      type: 'image',
      content: messageText,
      imageUrls: imageUrls, // 使用预先创建的URL数组
      timestamp: new Date(),
      role: 'user'
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // 创建思考中的临时消息
    const thinkingMessageId = Date.now() + 1;
    const thinkingMessage = {
      id: thinkingMessageId,
      type: 'thinking',
      content: `正在分析${images.length}张图片...`,
      timestamp: new Date(),
      role: 'assistant',
      isThinking: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    // 使用流式图片API，传递所有图片
    await api.chat.sendImageMessage(
      messageText,
      images, // 传递所有图片
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
        await sendImageMessage(messageText, images, sessionId); // 传递所有图片
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
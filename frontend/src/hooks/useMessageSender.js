import { message } from 'antd';
import api from '../services/api';
import useSessionManager from './useSessionManager';

const useMessageSender = ({
  loading,
  setLoading,
  currentSessionId,
  setCurrentSessionId,
  setSessions,
  setMessages,
  updateBalance,
  navigate,
  addSession
}) => {
  const { createNewSession, isCreatingSession } = useSessionManager(
    addSession,
    setSessions,
    setCurrentSessionId,
    navigate
  );

  // 生成唯一ID的辅助函数
  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  // 发送消息的通用函数
  const sendMessage = async (messageText, messageImages, sessionId, thinkingMessageId, userMessageId) => {
    const options = {
      setMessages: (updater) => setMessages(updater, sessionId),
      updateBalance,
      setSessions,
      thinkingMessageId,
      messageId: generateUniqueId(),
      userMessageId,
      sessionId,
      setLoading
    };

    try {
      if (messageImages && messageImages.length > 0) {
        await api.chat.sendImageMessage(messageText, messageImages, sessionId, options);
      } else {
        await api.chat.sendTextMessage(messageText, sessionId, options);
      }
    } catch (apiError) {
      // 检查是否为会话相关错误
      const isSessionError = 
        apiError.message?.includes('会话不存在') || 
        apiError.response?.data?.code === 'SESSION_NOT_FOUND' ||
        apiError.message?.includes('foreign key constraint fails') ||
        apiError.response?.status === 404;
      
      if (isSessionError) {
        console.warn('检测到会话错误，重新创建会话');
        const newSessionId = await createNewSession();
        
        // 使用新会话ID重新发送
        options.sessionId = newSessionId;
        if (messageImages && messageImages.length > 0) {
          await api.chat.sendImageMessage(messageText, messageImages, newSessionId, options);
        } else {
          await api.chat.sendTextMessage(messageText, newSessionId, options);
        }
        
        message.success('已自动重新创建会话并发送消息');
      } else {
        throw apiError; // 重新抛出非会话相关错误
      }
    }
  };

  // 主要的发送消息处理函数
  const handleSendMessage = async (messageText, messageImages = [], setInputValue, setSelectedImages) => {
    if (loading || isCreatingSession) {
      console.log('正在处理上一条消息或创建会话，请稍候...');
      return;
    }
    
    setLoading(true);
    
    // 立即清空输入
    const tempMessageText = messageText;
    const tempMessageImages = [...messageImages];
    setInputValue && setInputValue('');
    setSelectedImages && setSelectedImages([]);
    
    try {
      let sessionId = currentSessionId;
      
      // 生成图片的markdown
      let imageMarkdown = '';
      if (tempMessageImages.length > 0) {
        imageMarkdown = tempMessageImages.map((image, index) => {
          const blobUrl = URL.createObjectURL(image);
          return `![${image.name}](${blobUrl})`;
        }).join('\n');
      }
      
      // 合并文本和图片markdown
      const fullContent = imageMarkdown ? 
        (imageMarkdown + (tempMessageText ? '\n\n' + tempMessageText : '')) : 
        tempMessageText;
      
      // 创建用户消息和思考消息
      const newMessage = {
        id: generateUniqueId(),
        type: 'text',
        content: fullContent,
        timestamp: new Date(),
        role: 'user',
        isUploading: tempMessageImages.length > 0
      };
      
      const thinkingMessage = {
        id: generateUniqueId(),
        type: 'thinking',
        content: tempMessageImages.length > 0 
          ? `正在分析${tempMessageImages.length}张图片...` 
          : '正在思考中...',
        timestamp: new Date(),
        role: 'assistant',
        isThinking: true
      };
      
      // 添加消息到当前显示列表
      setMessages(prev => [...prev, newMessage, thinkingMessage]);
      
      // 如果没有会话ID，创建新会话
      if (!sessionId) {
        sessionId = await createNewSession();
        // 将消息迁移到新会话缓存
        setMessages(prev => [...prev, newMessage, thinkingMessage], sessionId);
      }
      
      // 发送消息到后端
      await sendMessage(tempMessageText, tempMessageImages, sessionId, thinkingMessage.id, newMessage.id);
      
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return {
    handleSendMessage,
    isCreatingSession,
  };
};

export default useMessageSender;

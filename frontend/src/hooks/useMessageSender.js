import { message } from 'antd';
import api from '../services/api';

const useMessageSender = ({
  loading,
  setLoading,
  currentSessionId,
  setCurrentSessionId,
  setSessions,
  setMessages,
  updateBalance,
}) => {
  let messageIdCounter = 0;

  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const sendTextMessage = async (messageText, sessionId) => {
    // 直接调用API，不再添加消息（消息已在handleSendMessage中添加）
    await api.chat.sendTextMessage(
      messageText,
      sessionId,
      {
        setMessages: (updater) => setMessages(updater, sessionId),
        updateBalance,
        setSessions,
        thinkingMessageId: thinkingMessage.id, // 需要从参数传入
        messageId: generateUniqueId(),
        sessionId,
        setLoading
      }
    );
  };

  const sendImageMessage = async (messageText, images, sessionId) => {
    // 直接调用API，不再添加消息（消息已在handleSendMessage中添加）
    await api.chat.sendImageMessage(
      messageText,
      images,
      sessionId,
      {
        setMessages: (updater) => setMessages(updater, sessionId),
        updateBalance,
        setSessions,
        thinkingMessageId: thinkingMessage.id, // 需要从参数传入
        messageId: generateUniqueId(),
        sessionId,
        setLoading
      }
    );
  };

  const handleSendMessage = async (messageText, messageImages, setInputValue, setSelectedImages) => {
    if (loading) return;
    
    setLoading(true);
    
    // 立即清空输入（移到这里）
    const tempMessageText = messageText; // 保存消息文本的副本用于发送
    const tempMessageImages = [...messageImages]; // 保存图片的副本用于发送
    setInputValue('');
    setSelectedImages([]);
    
    try {
      let sessionId = currentSessionId;
      
      // 生成图片的blob URL markdown
      let imageMarkdown = '';
      if (tempMessageImages && tempMessageImages.length > 0) {
        const imageMarkdownParts = tempMessageImages.map((image, index) => {
          const blobUrl = URL.createObjectURL(image);
          return `![${image.name}](${blobUrl})`;
        });
        imageMarkdown = imageMarkdownParts.join('\n');
      }
      
      // 合并文本和图片markdown
      const fullContent = imageMarkdown ? 
        (imageMarkdown + (tempMessageText ? '\n\n' + tempMessageText : '')) : 
        tempMessageText;
      
      // 立即创建用户消息和思考消息
      const newMessage = {
        id: generateUniqueId(),
        type: 'text',
        content: fullContent,
        timestamp: new Date(),
        role: 'user',
        isUploading: tempMessageImages && tempMessageImages.length > 0
      };
      
      const thinkingMessage = {
        id: generateUniqueId(),
        type: 'thinking',
        content: tempMessageImages && tempMessageImages.length > 0 
          ? `正在分析${tempMessageImages.length}张图片...` 
          : '正在思考中...',
        timestamp: new Date(),
        role: 'assistant',
        isThinking: true
      };
      
      // 无论是否有sessionId，都先立即添加消息到当前显示列表
      setMessages(prev => [...prev, newMessage, thinkingMessage]);
      
      if (!sessionId) {
        // 创建新会话
        const response = await api.session.createSession();
        sessionId = response.data.id;
        
        const newSession = {
          id: sessionId,
          title: response.data.title,
          lastMessageAt: response.data.lastMessageAt,
          messageCount: 0,
          createdAt: response.data.createdAt
        };
        setSessions(prev => [newSession, ...prev]);
        
        // 先将消息迁移到正式会话缓存中，避免被覆盖
        setMessages(prev => [...prev, newMessage, thinkingMessage], sessionId);
        
        // 然后再更新会话ID，此时缓存中已有消息，不会被覆盖
        setCurrentSessionId(sessionId);
      }
      // 移除else分支中的会话验证逻辑，直接发送消息
      // 如果会话真的失效，API调用时会返回错误，在catch中处理
      
      // 发送消息到后端
      try {
        if (messageImages && messageImages.length > 0) {
          await api.chat.sendImageMessage(
            messageText,
            messageImages,
            sessionId,
            {
              setMessages: (updater) => setMessages(updater, sessionId),
              updateBalance,
              setSessions,
              thinkingMessageId: thinkingMessage.id,
              messageId: generateUniqueId(),
              userMessageId: newMessage.id, // 添加这一行
              sessionId,
              setLoading
            }
          );
        } else {
          await api.chat.sendTextMessage(
            messageText,
            sessionId,
            {
              setMessages: (updater) => setMessages(updater, sessionId),
              updateBalance,
              setSessions,
              thinkingMessageId: thinkingMessage.id,
              messageId: generateUniqueId(),
              userMessageId: newMessage.id, // 添加这一行
              sessionId,
              setLoading
            }
          );
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
          
          // 创建新会话并重新发送
          const response = await api.session.createSession();
          const newSessionId = response.data.id;
          
          const newSession = {
            id: newSessionId,
            title: response.data.title,
            lastMessageAt: response.data.lastMessageAt,
            messageCount: 0,
            createdAt: response.data.createdAt
          };
          setSessions(prev => [newSession, ...prev.filter(s => s.id !== sessionId)]);
          setCurrentSessionId(newSessionId);
          
          // 重新发送消息
          if (messageImages && messageImages.length > 0) {
            await api.chat.sendImageMessage(
              messageText,
              messageImages,
              newSessionId,
              {
                setMessages: (updater) => setMessages(updater, newSessionId),
                updateBalance,
                setSessions,
                thinkingMessageId: thinkingMessage.id,
                messageId: generateUniqueId(),
                sessionId: newSessionId,
                setLoading
              }
            );
          } else {
            await api.chat.sendTextMessage(
              messageText,
              newSessionId,
              {
                setMessages: (updater) => setMessages(updater, newSessionId),
                updateBalance,
                setSessions,
                thinkingMessageId: thinkingMessage.id,
                messageId: generateUniqueId(),
                sessionId: newSessionId,
                setLoading
              }
            );
          }
          
          message.success('已自动重新创建会话并发送消息');
        } else {
          throw apiError; // 重新抛出非会话相关错误
        }
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请重试');
    } finally {
      setLoading(false);
      // 移除这里的清空输入代码
      // setInputValue('');
      // setSelectedImages([]);
    }
};
  
  return {
    handleSendMessage,
    sendTextMessage,
    sendImageMessage
  };
};

export default useMessageSender;

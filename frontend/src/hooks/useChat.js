import { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useToken } from '../contexts/TokenContext';
import api from '../services/api';

const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // 从localStorage恢复当前会话ID
  const [currentSessionId, setCurrentSessionIdState] = useState(() => {
    try {
      const savedSessionId = localStorage.getItem('currentSessionId');
      console.log('🔍 初始化时从localStorage读取会话ID:', savedSessionId);
      return savedSessionId || null;
    } catch (error) {
      console.error('读取localStorage失败:', error);
      return null;
    }
  });
  
  const messagesEndRef = useRef(null);
  const { updateBalance } = useToken();

  // 包装setCurrentSessionId，同时更新localStorage
  const setCurrentSessionId = (sessionId) => {
    setCurrentSessionIdState(sessionId);
    try {
      if (sessionId) {
        localStorage.setItem('currentSessionId', sessionId);
        console.log('💾 已保存会话ID到localStorage:', sessionId);
      } else {
        localStorage.removeItem('currentSessionId');
        console.log('🗑️ 已从localStorage删除会话ID');
      }
    } catch (error) {
      console.error('保存到localStorage失败:', error);
    }
  };

  // 页面加载时，如果有保存的会话ID，自动加载该会话的消息
  useEffect(() => {
    if (currentSessionId) {
      loadSessionMessages(currentSessionId);
    }
  }, []); // 只在组件挂载时执行一次

  const loadSessionMessages = async (sessionId) => {
    try {
      setLoading(true);
      const response = await api.session.getSessionMessages(sessionId);
      
      // 转换后端消息格式为前端期望的格式
      const convertedMessages = [];
      
      (response.data.messages || []).forEach(msg => {
        // 添加用户消息
        if (msg.userMessage) {
          convertedMessages.push({
            id: `${msg.id}-user`,
            type: msg.type === 'image' ? 'image' : 'text',
            content: msg.userMessage,
            role: 'user',
            timestamp: new Date(msg.createdAt),
            imageUrl: msg.imageUrl || undefined
          });
        }
        
        // 添加AI回复消息
        if (msg.aiResponse) {
          convertedMessages.push({
            id: `${msg.id}-assistant`,
            type: 'text',
            content: msg.aiResponse,
            role: 'assistant',
            timestamp: new Date(msg.createdAt),
            tokensUsed: msg.tokensUsed,
            isError: msg.isError || false
          });
        }
      });
      
      setMessages(convertedMessages);
      
      // 加载完消息后立即滚动到底部
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } catch (error) {
      console.error('加载会话消息失败:', error);
      message.error('加载会话消息失败');
      
      // 只在确认会话真的不存在时才清除ID，而不是所有404错误
      if (error.response?.status === 404 && error.response?.data?.code === 'SESSION_NOT_FOUND') {
        setCurrentSessionId(null);
      }
      // 对于其他错误（如网络问题、资源加载失败等），保持会话ID不变
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = (immediate = false) => {
    if (immediate) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    } else {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  return {
    messages,
    setMessages,
    loading,
    setLoading,
    currentSessionId,
    setCurrentSessionId,
    messagesEndRef,
    loadSessionMessages,
    scrollToBottom,
    updateBalance
  };
};

export default useChat;
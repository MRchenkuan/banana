import { useState, useRef, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useToken } from '../contexts/TokenContext';
import api from '../services/api';

const useChat = () => {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // 从localStorage恢复当前会话ID
  const [currentSessionId, setCurrentSessionIdState] = useState(() => {
    try {
      return localStorage.getItem('currentSessionId') || null;
    } catch (error) {
      console.error('读取localStorage失败:', error);
      return null;
    }
  });
  
  const messagesEndRef = useRef(null);
  const { updateBalance } = useToken();
  
  // 清理当前会话的所有相关缓存
  const clearCurrentSessionCache = useCallback(() => {
    if (currentSessionId) {
      console.log('🗑️ 清理当前会话:', currentSessionId);
    }
    
    // 清理localStorage
    try {
      localStorage.removeItem('currentSessionId');
      console.log('🗑️ 已从localStorage删除会话ID');
    } catch (error) {
      console.error('清理localStorage失败:', error);
    }
    
    // 重置当前会话ID
    setCurrentSessionIdState(null);
  }, [currentSessionId]);
  
  // 验证并清理无效会话
  const validateAndCleanSession = useCallback(async (sessionId) => {
    if (!sessionId) return false;
    
    try {
      // 直接验证会话是否存在
      await api.session.getSessionMessages(sessionId, 1, 1);
      return true;
    } catch (error) {
      console.error('验证会话时出错:', error);
      
      // 如果是当前会话，则完全清理
      if (sessionId === currentSessionId) {
        clearCurrentSessionCache();
      }
      
      return false;
    }
  }, [currentSessionId, clearCurrentSessionCache]);

  // 设置当前会话ID
  const setCurrentSessionId = useCallback((sessionId) => {
    // 如果是相同的会话ID，不做任何操作
    if (sessionId === currentSessionId) {
      console.log(`已经是当前会话 ${sessionId}，跳过切换`);
      return;
    }
    
    console.log(`切换到会话: ${sessionId}`);
    setCurrentSessionIdState(sessionId);
    
    // 清空当前消息，等待重新加载
    setMessages([]);
    
    // 修复类型检查：确保sessionId是字符串类型再调用startsWith
    try {
      if (sessionId && String(sessionId).startsWith('temp-') === false) {
        // 只有在选中有效会话时才保存（排除临时会话）
        localStorage.setItem('currentSessionId', String(sessionId));
        console.log('💾 已保存会话ID到localStorage:', sessionId);
      } else if (!sessionId) {
        // 清理时移除localStorage
        localStorage.removeItem('currentSessionId');
        console.log('🗑️ 已从localStorage删除会话ID');
      }
      // 临时会话ID不保存到localStorage
    } catch (error) {
      console.error('localStorage操作失败:', error);
    }
  }, [currentSessionId]);

  // 清理localStorage的专用函数
  const clearCurrentSessionFromStorage = useCallback(() => {
    try {
      localStorage.removeItem('currentSessionId');
      console.log('🗑️ 已清理localStorage中的会话ID');
    } catch (error) {
      console.error('清理localStorage失败:', error);
    }
  }, []);

  // 加载会话消息
  const loadSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId || String(sessionId).startsWith('temp-')) {
      return [];
    }
    
    setLoading(true);
    
    try {
      console.log(`加载会话 ${sessionId} 的消息`);
      const response = await api.session.getSessionMessages(sessionId);
      const {messages, pagination} = response?.data||{}
      
      // 转换消息格式 - 拆分用户消息和AI消息
      const formattedMessages = [];
      messages.forEach(msg => {
        // 如果消息已经是拆分格式（有role字段）
        if (msg.role) {
          formattedMessages.push({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            role: msg.role,
            content: msg.content || '',
            timestamp: msg.created_at || new Date(),
            images: msg.images || []
          });
        } 
        // 如果消息是合并格式（有userMessage和aiResponse字段）
        else if (msg.userMessage || msg.aiResponse) {
          // 添加用户消息
          if (msg.userMessage) {
            formattedMessages.push({
              id: `${msg.id}-user` || `msg-user-${Date.now()}-${Math.random()}`,
              role: 'user',
              content: msg.userMessage,
              timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
              images: msg.images || [],
              imageUrl: msg.imageUrl
            });
          }
          
          // 添加AI消息
          if (msg.aiResponse) {
            formattedMessages.push({
              id: `${msg.id}-assistant` || `msg-assistant-${Date.now()}-${Math.random()}`,
              role: 'assistant',
              content: msg.aiResponse,
              timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
              tokensUsed: msg.tokensUsed,
              isError: msg.isError || false
            });
          }
        }
      });
      
      console.log(`成功格式化 ${formattedMessages.length} 条消息`);
      setMessages(formattedMessages);
      return formattedMessages;
    } catch (error) {
      console.error(`加载会话 ${sessionId} 的消息失败:`, error);
      setMessages([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setMessages, setLoading]);
  
  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end' 
      });
    }
  }, [messagesEndRef]);

  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    // 简单实现：直接滚动到底部
    scrollToBottom(false);
  }, [scrollToBottom]);

  return {
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
    loadSessionMessages
  };
};

export default useChat;
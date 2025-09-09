import { useState, useRef, useEffect } from 'react';
import { message } from 'antd';
import { useToken } from '../contexts/TokenContext';
import useSessionCache from './useSessionCache';
import api from '../services/api';

const useChat = () => {
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
  
  // 使用会话缓存
  const {
    getSessionData,
    loadSessionIfNeeded,
    updateSessionMessages,
    saveScrollPosition,
    getScrollPosition
  } = useSessionCache();
  
  // 获取当前会话的消息和状态
  const currentSessionData = getSessionData(currentSessionId);
  const messages = currentSessionData.messages;
  const sessionLoading = currentSessionData.loading;
  
  // 包装setCurrentSessionId，同时更新localStorage
  const setCurrentSessionId = (sessionId) => {
    // 保存当前会话的滚动位置
    if (currentSessionId && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        saveScrollPosition(currentSessionId, container.scrollTop);
      }
    }
    
    setCurrentSessionIdState(sessionId);
    try {
      if (sessionId) {
        localStorage.setItem('currentSessionId', sessionId);
        console.log('💾 已保存会话ID到localStorage:', sessionId);
        // 预加载新会话的消息
        loadSessionIfNeeded(sessionId);
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
    loadSessionIfNeeded(currentSessionId);
  }
}, [currentSessionId]); // 移除 
  
  // 设置消息（用于兼容现有代码）
  const setMessages = (updater) => {
    if (currentSessionId) {
      updateSessionMessages(currentSessionId, updater);
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
  
  // 恢复滚动位置
  const restoreScrollPosition = () => {
    if (currentSessionId && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      const savedPosition = getScrollPosition(currentSessionId);
      if (container && savedPosition > 0) {
        setTimeout(() => {
          container.scrollTop = savedPosition;
        }, 50);
      }
    }
  };
  
  return {
    messages,
    setMessages,
    loading: loading || sessionLoading,
    setLoading,
    currentSessionId,
    setCurrentSessionId,
    messagesEndRef,
    loadSessionMessages: loadSessionIfNeeded, // 兼容现有代码
    scrollToBottom,
    restoreScrollPosition,
    updateBalance
  };
};

export default useChat;
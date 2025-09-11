import { useState, useRef, useEffect, useCallback } from 'react';
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
    getScrollPosition,
    clearSessionCache,
    clearAllCache,
    validateSession
  } = useSessionCache();
  
  // 获取当前会话的消息和状态
  const currentSessionData = getSessionData(currentSessionId);
  const messages = currentSessionData.messages;
  const sessionLoading = currentSessionData.loading;
  
  // 清理当前会话的所有相关缓存
  const clearCurrentSessionCache = useCallback(() => {
    if (currentSessionId) {
      console.log('🗑️ 清理当前会话缓存:', currentSessionId);
      clearSessionCache(currentSessionId);
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
  }, [currentSessionId, clearSessionCache]);
  
  // 验证并清理无效会话
  const validateAndCleanSession = useCallback(async (sessionId) => {
    if (!sessionId) return false;
    
    try {
      // 先检查缓存中是否已有数据，避免重复验证
      const cachedData = getSessionData(sessionId);
      if (cachedData && !cachedData.error) {
        return true;
      }
      
      const isValid = await validateSession(sessionId);
      if (!isValid) {
        console.warn('会话无效，清理相关缓存:', sessionId);
        clearSessionCache(sessionId);
        
        // 如果是当前会话，则完全清理
        if (sessionId === currentSessionId) {
          clearCurrentSessionCache();
        }
      }
      return isValid;
    } catch (error) {
      console.error('验证会话时出错:', error);
      return false;
    }
  }, [validateSession, clearSessionCache, currentSessionId, clearCurrentSessionCache, getSessionData]);

  // 包装setCurrentSessionId，只在选中会话时保存到localStorage
  const setCurrentSessionId = useCallback(async (sessionId) => {
    // 保存当前会话的滚动位置
    if (currentSessionId && messagesEndRef.current) {
      const container = messagesEndRef.current.parentElement;
      if (container) {
        saveScrollPosition(currentSessionId, container.scrollTop);
      }
    }
    
    setCurrentSessionIdState(sessionId);
    
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
  }, [currentSessionId, messagesEndRef, saveScrollPosition]);

  // 清理localStorage的专用函数
  const clearCurrentSessionFromStorage = useCallback(() => {
    try {
      localStorage.removeItem('currentSessionId');
      console.log('🗑️ 已清理localStorage中的会话ID');
    } catch (error) {
      console.error('清理localStorage失败:', error);
    }
  }, []);

  // 页面加载时，验证保存的会话ID
  useEffect(() => {
    if (currentSessionId) {
      // 合并验证和加载逻辑，避免重复调用
      const loadAndValidateSession = async () => {
        try {
          // 先尝试加载，如果失败则说明会话无效
          await loadSessionIfNeeded(currentSessionId);
        } catch (error) {
          // 如果加载失败，清理缓存和currentSessionId
          console.warn('会话加载失败，清理缓存:', currentSessionId);
          clearSessionCache(currentSessionId);
          // 清理currentSessionId，避免循环触发
          setCurrentSessionIdState(null);
          // 同时清理localStorage
          try {
            localStorage.removeItem('currentSessionId');
            console.log('🗑️ 已清理localStorage中的会话ID');
          } catch (storageError) {
            console.error('清理localStorage失败:', storageError);
          }
        }
      };
      
      loadAndValidateSession();
    }
  }, [currentSessionId, loadSessionIfNeeded, clearSessionCache]); // 移除clearCurrentSessionCache依赖
  
  // 设置消息（用于兼容现有代码）
  const setMessages = (updater, explicitSessionId = null) => {
    const targetSessionId = explicitSessionId || currentSessionId;
    
    if (targetSessionId) {
      // 有sessionId时，正常更新对应会话的消息
      updateSessionMessages(targetSessionId, updater);
    } else {
      // 没有sessionId时，直接更新当前显示的消息列表
      // 这种情况通常发生在创建新会话的过程中
      const currentMessages = messages || [];
      const newMessages = typeof updater === 'function' 
        ? updater(currentMessages) 
        : updater;
      
      // 创建一个临时的会话数据来存储消息
      // 使用特殊的临时ID来标识这是一个临时状态
      const tempSessionId = 'temp-' + Date.now();
      
      // 先设置临时会话ID，确保消息能够显示
      setCurrentSessionIdState(tempSessionId);
      
      // 然后更新消息
      updateSessionMessages(tempSessionId, () => newMessages);
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
    loadSessionMessages: loadSessionIfNeeded,
    scrollToBottom,
    restoreScrollPosition,
    updateBalance,
    clearCurrentSessionCache,
    validateAndCleanSession,
    clearCurrentSessionFromStorage // 新增
  };
};

export default useChat;
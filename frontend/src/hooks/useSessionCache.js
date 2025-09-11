import { useState, useRef, useCallback } from 'react';
import api from '../services/api';
import { message } from 'antd';

const useSessionCache = () => {
  // 会话缓存：sessionId -> { messages, scrollPosition, loading, lastUpdated }
  const [sessionCache, setSessionCache] = useState(new Map());
  const scrollPositions = useRef(new Map());
  
  // 获取会话数据
  const getSessionData = useCallback((sessionId) => {
    if (!sessionId) return { messages: [], loading: false };
    return sessionCache.get(sessionId) || { messages: [], loading: false };
  }, [sessionCache]);
  
  // 加载会话消息（仅在缓存中不存在时加载）
  const loadSessionIfNeeded = useCallback(async (sessionId) => {
    if (!sessionId) return;
    
    // 检查是否为临时会话ID，如果是则跳过API调用
    // 修复：确保sessionId是字符串类型再调用startsWith
    try {
      if (String(sessionId).startsWith('temp-')) {
        console.log('跳过临时会话ID的API调用:', sessionId);
        return [];
      }
    } catch (error) {
      console.error('检查sessionId类型失败:', error, '类型:', typeof sessionId, '值:', sessionId);
    }
    
    // 使用函数式更新避免依赖sessionCache
    setSessionCache(prev => {
      const cached = prev.get(sessionId);
      if (cached && cached.messages.length > 0) {
        // 已缓存，直接返回，不更新状态
        return prev;
      }
      
      // 设置加载状态
      const newCache = new Map(prev);
      newCache.set(sessionId, { 
        messages: cached?.messages || [], 
        loading: true,
        lastUpdated: Date.now()
      });
      return newCache;
    });
  
    const cached = sessionCache.get(sessionId);
    if (cached && cached.messages.length > 0) {
      // 已缓存，直接返回
      return cached.messages;
    }
    
    try {
      // 设置加载状态
      setSessionCache(prev => {
        const newCache = new Map(prev);
        newCache.set(sessionId, { 
          messages: cached?.messages || [], 
          loading: true,
          lastUpdated: Date.now()
        });
        return newCache;
      });
      
      const response = await api.session.getSessionMessages(sessionId);
      
      // 转换消息格式
      const convertedMessages = [];
      (response.data.messages || []).forEach(msg => {
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
      
      // 更新缓存
      setSessionCache(prev => {
        const newCache = new Map(prev);
        newCache.set(sessionId, {
          messages: convertedMessages,
          loading: false,
          lastUpdated: Date.now()
        });
        return newCache;
      });
      
      return convertedMessages;
    } catch (error) {
      console.error('加载会话消息失败:', error);
      message.error('加载会话消息失败');
      
      // 更新错误状态
      setSessionCache(prev => {
        const newCache = new Map(prev);
        newCache.set(sessionId, {
          messages: [],
          loading: false,
          error: error.message,
          lastUpdated: Date.now()
        });
        return newCache;
      });
      
      return [];
    }
  }, []);
  
  // 更新会话消息（用于新消息）
  const updateSessionMessages = useCallback((sessionId, updater) => {
    if (!sessionId) return;
    
    setSessionCache(prev => {
      const newCache = new Map(prev);
      const current = newCache.get(sessionId) || { messages: [], loading: false };
      const newMessages = typeof updater === 'function' 
        ? updater(current.messages) 
        : updater;
      
      newCache.set(sessionId, {
        ...current,
        messages: newMessages,
        lastUpdated: Date.now()
      });
      return newCache;
    });
  }, []);
  
  // 保存滚动位置
  const saveScrollPosition = useCallback((sessionId, position) => {
    if (sessionId) {
      scrollPositions.current.set(sessionId, position);
    }
  }, []);
  
  // 获取滚动位置
  const getScrollPosition = useCallback((sessionId) => {
    return scrollPositions.current.get(sessionId) || 0;
  }, []);
  
  // 清理过期缓存（可选，防止内存泄漏）
  const cleanupCache = useCallback((maxAge = 30 * 60 * 1000) => { // 30分钟
    const now = Date.now();
    setSessionCache(prev => {
      const newCache = new Map();
      for (const [sessionId, data] of prev) {
        if (now - data.lastUpdated < maxAge) {
          newCache.set(sessionId, data);
        }
      }
      return newCache;
    });
  }, []);

  // 清理指定会话的所有缓存
    const clearSessionCache = useCallback((sessionId) => {
      if (!sessionId) return;
      
      console.log('🗑️ 清理会话缓存:', sessionId);
      
      // 清理内存缓存
      setSessionCache(prev => {
        const newCache = new Map(prev);
        newCache.delete(sessionId);
        return newCache;
      });
      
      // 清理滚动位置缓存
      scrollPositions.current.delete(sessionId);
    }, []);
    
    // 清理所有缓存
    const clearAllCache = useCallback(() => {
      console.log('🗑️ 清理所有会话缓存');
      setSessionCache(new Map());
      scrollPositions.current.clear();
    }, []);
    
    // 验证会话是否存在（新增方法）
    const validateSession = useCallback(async (sessionId) => {
      if (!sessionId) return false;
      
      // 临时会话ID始终视为有效，避免API调用
      if (sessionId.startsWith('temp-')) {
        return true;
      }
      
      try {
        await api.session.getSessionMessages(sessionId, 1, 1);
        return true;
      } catch (error) {
        if (error.response?.status === 404 || 
            error.response?.data?.code === 'SESSION_NOT_FOUND') {
          console.warn('会话验证失败，会话不存在:', sessionId);
          return false;
        }
        // 其他错误不清理缓存
        throw error;
      }
    }, []);
  
  return {
    getSessionData,
    loadSessionIfNeeded,
    updateSessionMessages,
    saveScrollPosition,
    getScrollPosition,
    cleanupCache,
    clearSessionCache,
    clearAllCache,
    validateSession,
    sessionCache
  };
};

export default useSessionCache;
import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import api from '../services/api';

// 创建一个全局状态存储
const globalState = {
  sessions: [],
  listeners: new Set(),
  hasInitialized: false,
  isLoading: false
};

// 通知所有监听器状态已更新
const notifyListeners = () => {
  globalState.listeners.forEach(listener => listener(globalState.sessions));
};

// 通知加载状态变化
const notifyLoadingChange = (isLoading) => {
  globalState.isLoading = isLoading;
  globalState.loadingListeners.forEach(listener => listener(isLoading));
};

// 初始化全局状态
if (!globalState.loadingListeners) {
  globalState.loadingListeners = new Set();
}

const useSessionsStore = () => {
  const [sessions, setSessions] = useState(globalState.sessions);
  const [sessionsLoading, setSessionsLoading] = useState(globalState.isLoading);
  const [hasLoaded, setHasLoaded] = useState(globalState.hasInitialized);
  
  // 注册会话监听器
  useEffect(() => {
    const listener = (newSessions) => {
      setSessions(newSessions);
    };
    
    globalState.listeners.add(listener);
    return () => {
      globalState.listeners.delete(listener);
    };
  }, []);
  
  // 注册加载状态监听器
  useEffect(() => {
    const loadingListener = (isLoading) => {
      setSessionsLoading(isLoading);
    };
    
    globalState.loadingListeners.add(loadingListener);
    return () => {
      globalState.loadingListeners.delete(loadingListener);
    };
  }, []);
  
  // 初始化时设置已加载状态
  useEffect(() => {
    setHasLoaded(globalState.hasInitialized);
  }, []);

  // 加载会话列表
  // 修改 loadSessions 函数
  const loadSessions = useCallback(async (force = false) => {
    // 如果已经加载过且不是强制刷新，则跳过
    if (globalState.hasInitialized && !force) {
      return globalState.sessions;
    }
    
    // 如果未登录，跳过API调用
    if (!localStorage.getItem('token')) {
      console.log('未登录状态，跳过加载会话列表');
      globalState.hasInitialized = true;
      setHasLoaded(true);
      return [];
    }
    
    // 如果正在加载中，跳过重复请求
    if (globalState.isLoading) {
      return globalState.sessions;
    }
    
    try {
      notifyLoadingChange(true);
      const response = await api.session.getSessions();
      const newSessions = response.data.sessions || [];
      console.log('加载会话列表成功:', newSessions);
      
      // 更新全局状态
      globalState.sessions = newSessions;
      globalState.hasInitialized = true;
      notifyListeners();
      setHasLoaded(true);
      
      // 在这里恢复上次的会话
      try {
        const savedSessionId = localStorage.getItem('currentSessionId');
        if (savedSessionId) {
          // 检查保存的会话ID是否存在于新加载的会话列表中
          const sessionExists = newSessions.some(s => String(s.id) === String(savedSessionId));
          if (!sessionExists) {
            // 如果会话不存在，清除localStorage中的记录
            console.log('保存的会话ID不存在于会话列表中，清除记录:', savedSessionId);
            localStorage.removeItem('currentSessionId');
          }
        }
      } catch (error) {
        console.error('处理保存的会话ID时出错:', error);
      }
      
      return newSessions;
    } catch (error) {
      console.error('加载会话列表失败:', error);
      if (error.response?.status !== 401) { // 忽略未授权错误的提示
        message.error('加载会话列表失败');
      }
      globalState.hasInitialized = true;
      setHasLoaded(true);
      return [];
    } finally {
      notifyLoadingChange(false);
    }
  }, []);

  // 添加会话 - 确保不重复添加
  const addSession = useCallback((newSession) => {
    if (!newSession) return;
    
    // 检查会话是否已存在
    const exists = globalState.sessions.some(s => s.id === newSession.id);
    if (exists) {
      return; // 如果已存在，不做更改
    }
    
    console.log('添加新会话到列表:', newSession);
    
    // 更新全局状态
    globalState.sessions = [newSession, ...globalState.sessions];
    notifyListeners();
    
    return newSession;
  }, []);

  // 更新会话
  const updateSession = useCallback((sessionId, updater) => {
    if (!sessionId) return;
    
    // 更新全局状态
    const updatedSessions = globalState.sessions.map(session => {
      if (session.id === sessionId) {
        const updatedSession = typeof updater === 'function'
          ? updater(session)
          : { ...session, ...updater };
        return updatedSession;
      }
      return session;
    });
    
    globalState.sessions = updatedSessions;
    notifyListeners();
    
    return updatedSessions.find(s => s.id === sessionId);
  }, []);

  // 删除会话
  const removeSession = useCallback((sessionId) => {
    if (!sessionId) return;
    
    console.log('从列表中删除会话:', sessionId);
    
    // 更新全局状态
    globalState.sessions = globalState.sessions.filter(s => s.id !== sessionId);
    notifyListeners();
  }, []);

  // 重置会话列表
  const resetSessions = useCallback(() => {
    globalState.sessions = [];
    globalState.hasInitialized = false;
    notifyListeners();
  }, []);

  // 初始化加载 - 仅在首次挂载时执行一次
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !globalState.hasInitialized) {
      loadSessions();
    }
  }, [loadSessions]);

  return {
    sessions,
    setSessions: (newSessions) => {
      if (Array.isArray(newSessions)) {
        globalState.sessions = newSessions;
        notifyListeners();
      } else if (typeof newSessions === 'function') {
        globalState.sessions = newSessions(globalState.sessions);
        notifyListeners();
      }
    },
    sessionsLoading,
    hasLoaded,
    loadSessions,
    addSession,
    updateSession,
    removeSession,
    resetSessions
  };
};

export default useSessionsStore;
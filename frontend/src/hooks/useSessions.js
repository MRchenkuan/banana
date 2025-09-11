import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../services/api';

// 创建模块级别的共享状态
let globalSessions = [];
let globalLoading = false;
let isInitialized = false;
let listeners = [];

// 全局加载函数
const globalLoadSessions = async (force = false) => {
  // 如果已经在加载或已初始化且不是强制刷新，则跳过
  if ((globalLoading || (isInitialized && !force)) && !force) {
    return;
  }

  try {
    globalLoading = true;
    // 通知所有监听器更新加载状态
    listeners.forEach(listener => listener.setLoading(true));
    
    // 调用API获取会话列表
    const response = await api.session.getSessions();
    const newSessions = response.data.sessions || [];
    
    // 更新全局状态
    globalSessions = newSessions;
    isInitialized = true;
    
    // 通知所有监听器更新数据
    listeners.forEach(listener => {
      listener.setSessions(newSessions);
      listener.setLoading(false);
    });
  } catch (error) {
    console.error('加载会话列表失败:', error);
    message.error('加载会话列表失败');
  } finally {
    globalLoading = false;
  }
};

// 只在应用启动时加载一次
// 修改为检查是否有token再初始化
if (typeof window !== 'undefined' && !isInitialized && localStorage.getItem('token')) {
  globalLoadSessions();
}

const useSessions = () => {
  const [sessions, setSessions] = useState(globalSessions);
  const [sessionsLoading, setSessionsLoading] = useState(globalLoading);

  // 注册监听器
  useEffect(() => {
    const listener = {
      setSessions,
      setLoading: setSessionsLoading
    };
    
    // 添加到监听器列表
    listeners.push(listener);
    
    // 如果已有数据，立即同步
    if (isInitialized && globalSessions.length > 0) {
      setSessions(globalSessions);
    }
    
    // 如果正在加载，同步加载状态
    if (globalLoading) {
      setSessionsLoading(true);
    }
    
    // 清理函数
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  // 本地更新函数，同时更新全局状态和通知其他组件
  const updateSessions = (updater) => {
    const newSessions = typeof updater === 'function' 
      ? updater(globalSessions) 
      : updater;
    
    // 更新全局状态
    globalSessions = newSessions;
    
    // 更新所有组件的状态
    listeners.forEach(listener => {
      listener.setSessions(newSessions);
    });
  };

  // 本地加载函数，实际调用全局加载
  const loadSessions = (force = false) => {
    return globalLoadSessions(force);
  };

  return {
    sessions,
    setSessions: updateSessions,
    sessionsLoading,
    loadSessions
  };
};

export default useSessions;
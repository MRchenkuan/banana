import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // 加载会话列表
  const loadSessions = async (force = false) => {
    try {
      setSessionsLoading(true);
      const response = await api.session.getSessions();
      const newSessions = response.data.sessions || [];
      setSessions(newSessions);
    } catch (error) {
      console.error('加载会话列表失败:', error);
      message.error('加载会话列表失败');
    } finally {
      setSessionsLoading(false);
    }
  };

  // 创建一个稳定的更新函数，支持函数式更新和直接值更新
  const updateSessions = useCallback((updater) => {
    
    try {
      if (typeof updater === 'function') {
        // 函数式更新（如：prev => [newSession, ...prev]）
        setSessions(prevSessions => {
          return updater(prevSessions);
        });
      } else {
        setSessions(updater);
      }
    } catch (error) {
      console.error('❌ updateSessions error:', error);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadSessions();
    }
  }, []);

  return {
    sessions,
    setSessions: updateSessions, // 返回稳定的包装函数
    sessionsLoading,
    loadSessions
  };
};

export default useSessions;
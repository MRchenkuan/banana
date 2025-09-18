import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false); // 新增标志

  // 加载会话列表
  const loadSessions = async (force = false) => {
    try {
      setSessionsLoading(true);
      const response = await api.session.getSessions();
      const newSessions = response.data.sessions || [];
      setSessions(newSessions);
      setHasLoaded(true); // 标记已完成加载
    } catch (error) {
      console.error('加载会话列表失败:', error);
      message.error('加载会话列表失败');
      setHasLoaded(true); // 即使失败也标记为已加载
    } finally {
      setSessionsLoading(false);
    }
  };

  // 添加会话
  const addSession = (session) => {
    setSessions([...sessions, session]);
  }

  // 初始化加载
  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadSessions();
    }
  }, []);

  return {
    sessions,
    setSessions,
    sessionsLoading,
    hasLoaded, // 返回加载状态标志
    loadSessions,
    addSession
  };
};

export default useSessions;
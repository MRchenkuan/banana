import { useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../services/api';

const useSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      // 将 api.getSessions() 改为 api.session.getSessions()
      const response = await api.session.getSessions();
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('加载会话列表失败:', error);
      message.error('加载会话列表失败');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  return {
    sessions,
    setSessions,
    sessionsLoading,
    loadSessions
  };
};

export default useSessions;
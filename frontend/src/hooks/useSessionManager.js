import { useState, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';
import useSessionsStore from './useSessionsStore';

const useSessionManager = (setCurrentSessionId, navigate, currentSessionId) => {
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const { 
    sessions, 
    addSession, 
    removeSession, 
    loadSessions 
  } = useSessionsStore();

  // 创建新会话
  const createNewSession = useCallback(async () => {
    // 检查是否已登录
    if (!localStorage.getItem('token')) {
      console.log('未登录状态，无法创建新会话');
      message.error('请先登录');
      if (navigate) {
        navigate('/login');
      }
      return null;
    }
    
    // 防止重复创建
    if (isCreatingSession) {
      console.log('正在创建会话中，请勿重复操作');
      return null;
    }
    
    try {
      setIsCreatingSession(true);
      const response = await api.session.createSession();
      const newSession = response.data;
      
      console.log('创建新会话成功:', newSession);
      
      // 更新会话列表
      addSession(newSession);
      
      // 设置当前会话
      if (setCurrentSessionId) {
        setCurrentSessionId(newSession.id);
      }
      
      // 导航到聊天页面
      if (navigate) {
        navigate('/app/chat');
      }
      
      message.success('新会话创建成功');
      return newSession.id;
    } catch (error) {
      console.error('创建会话失败:', error);
      message.error('创建会话失败');
      return null;
    } finally {
      setIsCreatingSession(false);
    }
  }, [addSession, isCreatingSession, navigate, setCurrentSessionId]);

  // 删除会话
  const deleteSession = useCallback(async (sessionId) => {
    if (!sessionId) return false;
    
    // 检查是否已登录
    if (!localStorage.getItem('token')) {
      console.log('未登录状态，无法删除会话');
      message.error('请先登录');
      return false;
    }
    
    // 防止重复删除
    if (isDeletingSession) {
      console.log('正在删除会话中，请勿重复操作');
      return false;
    }
    
    try {
      setIsDeletingSession(true);
      await api.session.deleteSession(sessionId);
      
      console.log('删除会话成功:', sessionId);
      
      // 更新会话列表
      removeSession(sessionId);
      
      // 如果删除的是当前会话，则切换到第一个可用会话或清除当前会话
      if (sessionId === currentSessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        
        if (remainingSessions.length > 0) {
          if (setCurrentSessionId) {
            setCurrentSessionId(remainingSessions[0].id);
          }
          if (navigate) {
            navigate('/app/chat');
          }
        } else {
          if (setCurrentSessionId) {
            setCurrentSessionId(null);
          }
        }
      }
      
      message.success('会话删除成功');
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      message.error('删除会话失败');
      return false;
    } finally {
      setIsDeletingSession(false);
    }
  }, [currentSessionId, isDeletingSession, navigate, removeSession, sessions, setCurrentSessionId]);

  // 刷新会话列表
  const refreshSessions = useCallback(async () => {
    return await loadSessions(true);
  }, [loadSessions]);

  return {
    createNewSession,
    deleteSession,
    refreshSessions,
    isCreatingSession,
    isDeletingSession
  };
};

export default useSessionManager;
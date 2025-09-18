import { useState } from 'react';
import { message } from 'antd';
import api from '../services/api';

const useSessionManager = (addSession, setSessions, setCurrentSessionId, navigate, currentSessionId) => {
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // 创建新会话
  const createNewSession = async () => {
    try {
      setIsCreatingSession(true);
      const response = await api.session.createSession();
      const newSession = response.data;
      
      // 更新会话列表 - 使用函数式更新确保状态正确更新
      addSession(newSession);
      
      // 设置当前会话
      setCurrentSessionId(newSession.id);
      
      // 如果提供了导航函数，则导航到聊天页面
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
  };

  // 删除会话
  const deleteSession = async (sessionId) => {
    try {
      await api.session.deleteSession(sessionId);
      
      // 更新会话列表
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
        
        // 如果删除的是当前会话，则切换到第一个可用会话或清除当前会话
        if (sessionId === currentSessionId) {
          if (updatedSessions.length > 0) {
            setCurrentSessionId(updatedSessions[0].id);
            if (navigate) {
              navigate('/app/chat');
            }
          } else {
            setCurrentSessionId(null);
          }
        }
        
        return updatedSessions;
      });
      
      message.success('会话删除成功');
      return true;
    } catch (error) {
      console.error('删除会话失败:', error);
      message.error('删除会话失败');
      return false;
    }
  };

  return {
    createNewSession,
    deleteSession,
    isCreatingSession
  };
};

export default useSessionManager;
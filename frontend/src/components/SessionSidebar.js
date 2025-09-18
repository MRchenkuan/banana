import React from 'react';
import {
  Button,
  List,
  Modal,
  message
} from 'antd';
import {
  DeleteOutlined,
  MessageOutlined,
  CommentOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { theme } from '../constants/theme';

const SessionSidebar = ({
  sessions,
  currentSessionId,
  sessionsLoading,
  onSessionSwitch,
  onSessionsUpdate
}) => {
  // 创建新会话
  const createNewSession = async () => {
    try {
      // 将 api.createSession() 改为 api.session.createSession()
      const response = await api.session.createSession();
      const newSession = response.data;
      onSessionsUpdate(prev => [newSession, ...prev]);
      onSessionSwitch(newSession.id);
      message.success('新会话创建成功');
    } catch (error) {
      console.error('创建会话失败:', error);
      message.error('创建会话失败');
    }
  };

  // 删除会话
  const deleteSession = async (sessionId, e) => {
    e.stopPropagation();
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？删除后无法恢复。',
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.session.deleteSession(sessionId);
          message.success('会话删除成功');
        } catch (error) {
          console.error('删除会话失败:', error);
          message.error('删除会话失败');
          return; // 如果API调用失败，直接返回，不执行后续状态更新
        }
        
        // 将状态更新逻辑移到try-catch外，确保API成功后才执行
        try {
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          onSessionsUpdate(updatedSessions);
          
          // 规则2：在session列表被主动删除时，如果删除的是当前，则清理当前ID
          if (currentSessionId === sessionId) {
            console.log('🗑️ 删除当前会话，清理localStorage:', sessionId);
            
            if (updatedSessions.length > 0) {
              // 切换到第一个可用会话（规则1：选中时会自动保存ID）
              onSessionSwitch(updatedSessions[0].id);
            } else {
              // 没有其他会话，清理当前ID
              onSessionSwitch(null);
            }
          }
        } catch (stateError) {
          console.error('更新状态时出错:', stateError);
          // 状态更新失败不影响删除成功的提示
        }
      }
    });
  };

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#1f1f1f',
      borderRight: '1px solid #2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: '64px',
      zIndex: 100
    }}>
      {/* 创建新会话按钮 */}
      <div style={{ 
        padding: '16px',
        borderBottom: '1px solid #2a2a2a',
        backgroundColor: '#1f1f1f',
        flexShrink: 0
      }}>
        <Button 
          type="primary"
          icon={<CommentOutlined />}
          onClick={createNewSession}
          style={{ 
            width: '100%',
            background: '#1e293b', // 深蓝灰色，与暗色主题协调
            border: '1px solid #334155', // 添加微妙的边框
            color: '#ffffff',
            height: '44px',
            fontSize: '15px',
            fontWeight: '600',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)', // 减弱发光效果
            borderRadius: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.boxShadow = '0 3px 8px rgba(0, 0, 0, 0.2)'; // 减弱悬停时的发光效果
          }}
          onMouseLeave={(e) => {
            e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)'; // 减弱离开时的发光效果
          }}
        >
          新建对话
        </Button>
      </div>
      
      {/* 会话列表 - 可滚动区域 */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          <List
            loading={sessionsLoading}
            dataSource={sessions}
            renderItem={(session) => (
              <List.Item
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: String(currentSessionId) === String(session.id) ? '#434343' : 'transparent',
                  borderLeft: String(currentSessionId) === String(session.id) ? `3px solid ${theme.primary}` : '3px solid transparent',
                  margin: 0,
                  borderRadius: 0,
                  borderBottom: '1px solid #2a2a2a',
                  color: '#ffffff'
                }}
                onClick={() => onSessionSwitch(session.id)}
                onMouseEnter={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                  if (deleteBtn) deleteBtn.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const deleteBtn = e.currentTarget.querySelector('.delete-btn');
                  if (deleteBtn) deleteBtn.style.opacity = '0';
                }}
              >
                <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: String(currentSessionId) === String(session.id) ? 'bold' : 'normal',
                      fontSize: '14px',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#ffffff'
                    }}>
                      <MessageOutlined style={{ marginRight: '8px', color: theme.primary }} />
                      {session.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#d9d9d9' }}>
                      {session.messageCount} 条消息
                      {(session.lastMessageAt || session.createdAt) && (
                        <small> -  {new Date(session.lastMessageAt || session.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</small>
                      )}
                    </div>
                  </div>
                  <Button
                    className="delete-btn"
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => deleteSession(session.id, e)}
                    style={{
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      color: '#ff4d4f',
                      flexShrink: 0,
                      marginLeft: '8px'
                    }}
                  />
                </div>
              </List.Item>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionSidebar;
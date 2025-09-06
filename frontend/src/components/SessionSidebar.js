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
  CommentOutlined // 使用会话图标替代PlusOutlined
} from '@ant-design/icons';
import api from '../services/api';

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
      const response = await api.createSession();
      const newSession = response.data;
      onSessionsUpdate(prev => [newSession, ...prev]);
      onSessionSwitch(newSession.id, []);
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
          await api.deleteSession(sessionId);
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          onSessionsUpdate(() => updatedSessions);
          
          if (currentSessionId === sessionId) {
            if (updatedSessions.length > 0) {
              onSessionSwitch(updatedSessions[0].id);
            } else {
              onSessionSwitch(null, []);
            }
          }
          
          message.success('会话删除成功');
        } catch (error) {
          console.error('删除会话失败:', error);
          message.error('删除会话失败');
        }
      }
    });
  };

  return (
    <div style={{
      width: '280px',
      backgroundColor: '#1f1f1f',
      borderRight: '1px solid #434343',
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
        borderBottom: '1px solid #434343',
        backgroundColor: '#1f1f1f',
        flexShrink: 0
      }}>
        <Button 
          type="default"
          icon={<CommentOutlined />}
          onClick={createNewSession}
          style={{ 
            width: '100%',
            backgroundColor: '#262626',
            borderColor: '#434343',
            color: '#ffffff',
            height: '40px',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#434343';
            e.target.style.borderColor = '#595959';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#262626';
            e.target.style.borderColor = '#434343';
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
                  backgroundColor: currentSessionId === session.id ? '#434343' : 'transparent',
                  borderLeft: currentSessionId === session.id ? '3px solid #1890ff' : '3px solid transparent',
                  margin: 0,
                  borderRadius: 0,
                  borderBottom: '1px solid #434343',
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
                      fontWeight: currentSessionId === session.id ? 'bold' : 'normal',
                      fontSize: '14px',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#ffffff'
                    }}>
                      <MessageOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
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
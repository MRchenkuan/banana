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
import api from '../../services/api';
import styles from './SessionSidebar.module.css';

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
      
      // 先更新会话列表
      onSessionsUpdate(prev => [newSession, ...prev]);
      
      // 立即选中新会话，使用 Promise 确保状态同步
      await new Promise(resolve => {
        onSessionSwitch(newSession.id);
        // 给状态更新一点时间
        setTimeout(resolve, 50);
      });
      
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
    <div className={styles.sidebar}>
      {/* 创建新会话按钮 */}
      <div className={styles.newSessionContainer}>
        <Button 
          type="primary"
          icon={<CommentOutlined />}
          onClick={createNewSession}
          className={styles.newSessionButton}
        >
          新建对话
        </Button>
      </div>
      
      {/* 会话列表 - 可滚动区域 */}
      <div className={styles.sessionsContainer}>
        <div className={styles.sessionsScrollArea}>
          <List
            loading={sessionsLoading}
            dataSource={sessions}
            renderItem={(session) => {
              const isActive = String(currentSessionId) === String(session.id);
              return (
                <List.Item
                  className={`${styles.sessionItem} ${isActive ? styles.sessionItemActive : ''}`}
                  onClick={() => onSessionSwitch(session.id)}
                  onMouseEnter={(e) => {
                    const deleteBtn = e.currentTarget.querySelector(`.${styles.deleteButton}`);
                    if (deleteBtn) deleteBtn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    const deleteBtn = e.currentTarget.querySelector(`.${styles.deleteButton}`);
                    if (deleteBtn) deleteBtn.style.opacity = '0';
                  }}
                >
                  <div className={styles.sessionItemContent}>
                    <div className={styles.sessionInfo}>
                      <div className={`${styles.sessionTitle} ${isActive ? styles.sessionTitleActive : ''}`}>
                        <MessageOutlined className={styles.sessionIcon} />
                        {session.title}
                      </div>
                      <div className={styles.sessionMeta}>
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
                      className={styles.deleteButton}
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={(e) => deleteSession(session.id, e)}
                    />
                  </div>
                </List.Item>
              );
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionSidebar;
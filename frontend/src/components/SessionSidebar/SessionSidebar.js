import React from 'react';
import {
  Button,
  List,
  Modal,
  message,
  Spin
} from 'antd';
import {
  DeleteOutlined,
  MessageOutlined,
  CommentOutlined
} from '@ant-design/icons';
import styles from './SessionSidebar.module.css';

const SessionSidebar = ({
  sessions,
  currentSessionId,
  sessionsLoading,
  onSessionSwitch,
  createNewSession, // 使用传入的统一函数
  deleteSession,     // 使用传入的统一函数
  isCreatingSession  // 使用统一的创建状态
}) => {
  // 删除本地的 createNewSession 和 deleteSession 函数实现
  
  // 处理删除会话的点击事件
  const handleDeleteClick = (sessionId, e) => {
    e.stopPropagation();
    
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个会话吗？删除后无法恢复。',
      okText: '删除',
      okType: '危险',
      cancelText: '取消',
      onOk: () => deleteSession(sessionId)
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
          loading={isCreatingSession}
          disabled={isCreatingSession}
        >
          {isCreatingSession ? '创建中...' : '新建对话'}
        </Button>
      </div>
      
      {/* 会话列表 - 可滚动区域 */}
      <div className={styles.sessionsContainer}>
        <div className={styles.sessionsScrollArea}>
          <Spin spinning={sessionsLoading}>
            {sessionsLoading && <div style={{ textAlign: 'center', marginBottom: 8 }}>加载中...</div>}
            <List
              loading={false}
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
                        onClick={(e) => handleDeleteClick(session.id, e)}
                        disabled={isCreatingSession}
                      />
                    </div>
                  </List.Item>
                );
              }}
            />
          </Spin>
        </div>
      </div>
    </div>
  );
};

export default SessionSidebar;
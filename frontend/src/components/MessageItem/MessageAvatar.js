import React from 'react';
import { Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export const AssistantAvatar = ({ messageState }) => {
  const { isError, isInterrupted, isPending, isThinking } = messageState;
  
  const getStatusIcon = () => {
    if (isThinking) return '💭';
    return '🍌';
  };
  
  return (
    <Avatar
      style={{
        backgroundColor: isError ? '#d9d9d9' : isInterrupted ? '#f59e0b' : isPending ? '#0284c7' : '#eee',
        marginRight: '12px',
        flexShrink: 0,
        fontSize: '18px'
      }}
    >
      {getStatusIcon()}
    </Avatar>
  );
};

export const UserAvatar = () => {
  const { user } = useAuth();
  
  return (
    <Avatar
      style={{
        backgroundColor: theme.primary,
        marginLeft: '12px',
        flexShrink: 0,
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      src={user?.wechatAvatar} // 优先使用微信头像
      icon={!user?.wechatAvatar && <UserOutlined />} // 如果没有微信头像则显示默认图标
    />
  );
};
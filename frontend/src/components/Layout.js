import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Avatar, Dropdown, Space, Typography, Button, Spin } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  WalletOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToken } from '../contexts/TokenContext';
import SessionSidebar from './SessionSidebar/SessionSidebar';
import PaymentModal from './PaymentModal/PaymentModal';
import api from '../services/api';
import { theme } from '../constants/theme';
import useSessions from '../hooks/useSessions'; // 添加这一行
import { useChatContext } from '../contexts/ChatContext';
import useSessionManager from '../hooks/useSessionManager'; // 添加这一行

const { Header, Content } = AntLayout;
const { Text } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { balance } = useToken();
  
  // 使用共享的chat状态
  const { currentSessionId, setCurrentSessionId } = useChatContext();
  
  // 使用 useSessions hook 替代本地状态和加载逻辑
  const { sessions, setSessions, sessionsLoading, addSession } = useSessions();
  
  // 移除本地的currentSessionId状态
  // const [currentSessionId, setCurrentSessionId] = useState(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');
  const [creatingSession, setCreatingSession] = useState(false); // 添加创建会话状态


  const { createNewSession, deleteSession, isCreatingSession } = useSessionManager(
    addSession,
    setSessions, 
    setCurrentSessionId, 
    navigate,
    currentSessionId  // 添加这个参数
  );
  
  // 处理会话切换
  const handleSessionSwitch = (sessionId) => {
    setCurrentSessionId(sessionId); // 现在这个会更新共享状态
    // 直接跳转到聊天页面，不传递sessionId参数
    navigate('/app/chat');
  };
  
  // 修改userMenuItems数组，移除个人中心选项
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  const handleTokenClick = () => {
    // 打开充值面板
    setDefaultPackage('standard'); // 设置默认套餐
    setPaymentModalVisible(true);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  return (
    <AntLayout style={{ minHeight: '100vh', backgroundColor: '#141414' }}>
      {/* 全局加载蒙版 */}
      {creatingSession && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1500, // 确保在所有元素之上
        }}>
          <Spin size="large" tip="创建会话中..." />
        </div>
      )}
      
      {/* 顶部导航栏 */}
      <Header style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1001,
        padding: '0 24px', 
        background: '#1f1f1f', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        height: '64px',
        borderBottom: '1px solid #434343'
      }}>
        {/* 左侧：Logo */}
        <div 
          style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: theme.primary,
            cursor: 'pointer',
          }}
          onClick={handleLogoClick}
        >
          🍌 Banana
        </div>
        
        {/* 右侧：Token 余额和用户信息 */}
        <Space size="large">
          {/* 可点击的 Token 余额 */}
          <Button 
            type="text"
            icon={<WalletOutlined style={{ fontSize: '18px', color: theme.primary }} />}
            onClick={handleTokenClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 'auto',
              color: '#ffffff'
            }}
          >
            <Text strong style={{ color: theme.primary, marginLeft: '8px' }}>
              {typeof balance === 'number' ? balance.toLocaleString() : '0'} Tokens
            </Text>
          </Button>
          
          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            arrow
          >
            <Space style={{ cursor: 'pointer', alignItems: 'center',display:'flex' }}>
              <Avatar 
                icon={<UserOutlined />} 
                src={user?.wechatAvatar} 
                style={{ backgroundColor: theme.primary, display:'flex' }} 
              />
              <div>
                <Text style={{ color: '#ffffff', display: 'block' }}>{user?.username}</Text>
                <Text style={{ color: '#999999', fontSize: '12px', display: 'block' }}>用户ID: {user?.id}</Text>
              </div>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      
      {/* 左侧会话列表侧边栏 */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        sessionsLoading={sessionsLoading}
        onSessionSwitch={handleSessionSwitch}
        onSessionsUpdate={setSessions}
        createNewSession={createNewSession}
        deleteSession={deleteSession}
        isCreatingSession={isCreatingSession}
      />
      
      {/* 主内容区域 - 直接渲染增强的 children */}
      <Content style={{ 
        marginLeft: '280px',
        padding: '0',
        background: '#141414',
        minHeight: '100vh',
      }}>
        <div style={{ paddingTop: '70px' }}>
          {children}
        </div>
      </Content>
      
      {/* 支付弹窗 */}
      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        defaultPackage={defaultPackage}
      />
    </AntLayout>
  );
};

export default Layout;
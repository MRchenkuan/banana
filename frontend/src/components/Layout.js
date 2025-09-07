import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Avatar, Dropdown, Space, Typography, Button } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  WalletOutlined,
  MessageOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToken } from '../contexts/TokenContext';
import SessionSidebar from './SessionSidebar';
import PaymentModal from './PaymentModal';
import api from '../services/api';
import { theme } from '../constants/theme';

const { Header, Content } = AntLayout;
const { Text } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { balance } = useToken();
  
  // 会话管理状态
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');
  
  // 加载会话列表
  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await api.getSessions();
      setSessions(response.data.sessions); // 修复：正确获取sessions数组
    } catch (error) {
      console.error('加载会话列表失败:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  // 处理会话切换
  const handleSessionSwitch = (sessionId, messages = null) => {
    setCurrentSessionId(sessionId);
    // 跳转到聊天页面，并传递会话ID
    navigate(`/app/chat${sessionId ? `?sessionId=${sessionId}` : ''}`);
  };

  // 组件挂载时加载会话列表
  useEffect(() => {
    loadSessions();
  }, []);

  // 从URL参数中获取当前会话ID
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const sessionId = urlParams.get('sessionId');
    if (sessionId) {
      setCurrentSessionId(sessionId);
    }
  }, [location.search]);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/app/profile')
    },
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
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: theme.primary }} />
              <Text style={{ color: '#ffffff' }}>{user?.username}</Text>
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
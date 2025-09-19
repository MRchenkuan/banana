import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Avatar, Dropdown, Space, Typography, Button, Spin } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  WalletOutlined,
  MessageOutlined,
  HistoryOutlined,
  MoneyCollectOutlined,
  DollarCircleFilled
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToken } from '../contexts/TokenContext';
import SessionSidebar from './SessionSidebar/SessionSidebar';
import PaymentModal from './PaymentModal/PaymentModal';
import PaymentHistory from './PaymentModal/PaymentHistory';
import { theme } from '../constants/theme';
import useSessionsStore from '../hooks/useSessionsStore';
import { useChatContext } from '../contexts/ChatContext';
import useSessionManager from '../hooks/useSessionManager';
import { EventBus } from '../services/core/HttpClient';
import { usePayment } from '../hooks/usePayment';

const { Header, Content } = AntLayout;
const { Text } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { balance, fetchBalance } = useToken();
  
  // 使用共享的chat状态
  const { currentSessionId, setCurrentSessionId } = useChatContext();
  
  // 使用 useSessionsStore hook
  const { sessions, sessionsLoading } = useSessionsStore();
  
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');
  const [refreshing, setRefreshing] = useState(false);
  const {throttledRefreshOrderStatus} = usePayment()

  // 使用修改后的 useSessionManager
  const { createNewSession, deleteSession, isCreatingSession } = useSessionManager(
    setCurrentSessionId, 
    navigate,
    currentSessionId
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

  const handleLogoClick = () => {
    navigate('/');
  };

  // 在导入部分添加
  
  // 在 Layout 组件内部，useEffect 钩子中添加事件监听
  useEffect(() => {
    // 监听余额不足事件
    const unsubscribe = EventBus.subscribe('INSUFFICIENT_BALANCE', (data) => {
      // 打开充值面板
      setPaymentModalVisible(true);
      setDefaultPackage('standard'); // 设置默认套餐
    });
    
    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [setPaymentModalVisible, setDefaultPackage]); // 添加依赖项，确保监听器能够正确更新

  return (
    <AntLayout style={{ minHeight: '100vh', backgroundColor: '#141414' }}>
      {/* 全局加载蒙版 */}
      {isCreatingSession && (
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
          {/* 刷新Token按钮 */}
          <Button
            type="text"
            size="small"
            icon={<DollarCircleFilled spin={refreshing} style={{ fontSize: '16px', color: theme.primary }} />}
            onClick={()=>{setHistoryVisible(true);}}
            style={{
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              height: '32px',
              padding: '0 12px',
              fontSize: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            刷新
          </Button>
          
          {/* 可点击的 Token 余额 */}
          <Button 
            align="center" 
            onClick={()=>{setPaymentModalVisible(true);setDefaultPackage('standard');}}
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 12px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <WalletOutlined style={{ color: theme.primary, fontSize: '14px' }} />
            <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500', marginLeft: '8px' }}>
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
      
      {/* 支付历史弹窗 */}
      <PaymentHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onRefreshOrderStatus={throttledRefreshOrderStatus}
      />
    </AntLayout>
  );
};

export default Layout;
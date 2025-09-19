import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Avatar, Dropdown, Space, Typography, Button, Spin } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  DollarCircleFilled,
  ThunderboltFilled,
  QuestionCircleFilled
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

import GlassPanel from './GlassPanel/GlassPanel';


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
  const [helpVisible, setHelpVisible] = useState(false);
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
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16, color: 'white' }}>创建会话中...</div>
          </div>
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
          {/* 帮助按钮 */}
          <Button
            type="text"
            size="small"
            icon={<QuestionCircleFilled style={{ fontSize: '16px', color: theme.primary }} />}
            onClick={() => setHelpVisible(true)}
            style={{
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              height: '32px',
              padding: '0 12px',
              fontSize: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.3s ease',
              marginRight: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            }}
          />
          
          {/* 能量值和刷新按钮组 */}
          <div
            style={{ 
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              overflow: 'hidden',
              marginRight: '8px'
            }}
          >
            {/* 能量值部分 */}
            <div 
              onClick={()=>{setPaymentModalVisible(true);setDefaultPackage('standard');}}
              style={{ 
                display: 'flex',
                alignItems: 'center',
                padding: '4px 12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <ThunderboltFilled style={{ color: theme.primary, fontSize: '14px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500', marginLeft: '8px' }}>
                {typeof balance === 'number' ? balance.toLocaleString() : '0'} 能量值
              </Text>
            </div>
            
            {/* 刷新按钮部分 */}
            <div
              onClick={()=>{setHistoryVisible(true);}}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '0 10px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <DollarCircleFilled spin={refreshing} style={{ color: theme.primary, fontSize: '16px' }} />
            </div>
          </div>
          
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
      
      {/* 帮助面板 */}
      {helpVisible && (
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
          zIndex: 1500,
        }}>
          <GlassPanel 
            style={{ 
              width: '400px', 
              maxWidth: '90%', 
              padding: '24px',
              position: 'relative'
            }}
            shadow
            colored={false}
            gradientIntensity="medium"
          >
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
              <Button 
                type="text" 
                icon={<span style={{ fontSize: '18px' }}>×</span>} 
                onClick={() => setHelpVisible(false)}
                style={{ color: '#fff' }}
              />
            </div>
            <h2 style={{ color: '#fff', marginBottom: '20px', textAlign: 'center' }}>联系我们</h2>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>客服邮箱</h3>
              <p style={{ color: '#fff' }}>banana_ai@foxmail.com</p>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>微信客服</h3>
              <div style={{ textAlign: 'center' }}>
                <div style={{ 
                  width: '150px', 
                  height: '150px', 
                  background: '#fff', 
                  margin: '0 auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}>
                  <img style={{ width: '100%', height: '100%' }} alt="微信二维码" />
                </div>
                <p style={{ color: '#fff', marginTop: '10px' }}>扫码添加客服微信</p>
              </div>
            </div>
            <div>
              <h3 style={{ color: '#fff', marginBottom: '10px' }}>工作时间</h3>
              <p style={{ color: '#fff' }}>周一至周五 9:00-18:00</p>
            </div>
          </GlassPanel>
        </div>
      )}
      
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
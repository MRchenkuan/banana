import React, { useState } from 'react';
import { Space, Spin, Button, Typography } from 'antd';
import { LogoutOutlined, WalletOutlined, SyncOutlined, HistoryOutlined, DollarCircleOutlined, DollarCircleTwoTone, DollarOutlined, ThunderboltFilled } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useToken } from '../../contexts/TokenContext';
import PaymentModal from '../PaymentModal/PaymentModal';
import PaymentHistory from '../PaymentModal/PaymentHistory';
import { usePayment } from '../../hooks/usePayment';

const { Text } = Typography;

const HomeNavbar = ({ sdkLoading }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { balance, fetchBalance } = useToken();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');
  const [refreshing, setRefreshing] = useState(false);
  const {throttledRefreshOrderStatus} = usePayment();

  const navbarStyle = {
    padding: '0 24px',
    height: '64px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)'
  };

  const logoStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff'
  };

  const handleLogout = () => {
    logout();
  };

  const handleTokenClick = () => {
    // 打开充值面板
    setPaymentModalVisible(true);
    setDefaultPackage('standard'); // 设置默认套餐
  };

  const handleRefreshToken = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
    // 打开订单历史记录面板
    setHistoryVisible(true);
  };

  return (
    <div style={navbarStyle}>
      <div style={logoStyle}>🍌 Banana AI</div>
      <Space>
        {/* SDK 加载状态指示 */}
        {sdkLoading && (
          <Spin size="small" style={{ color: '#fff' }} />
        )}
        
        {/* 用户已登录时显示token余额和退出按钮 */}
        {isAuthenticated && user && (
          <>
            {/* 刷新Token按钮 */}
            <Button
              type="text"
              size="small"
              icon={<DollarCircleOutlined spin={refreshing} />}
              onClick={handleRefreshToken}
              style={{
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                height: '32px',
                padding: '0 12px',
                fontSize: '12px',
                marginRight: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              刷新
            </Button>
            
            <Space 
              align="center" 
              onClick={handleTokenClick}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '4px 12px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              <ThunderboltFilled style={{ color: '#fff', fontSize: '14px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                {typeof balance === 'number' ? balance.toLocaleString() : '0'} 能量值
              </Text>
            </Space>
            
            {/* 退出登录按钮 */}
            <Button
              type="text"
              size="small"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              style={{
                color: '#fff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                height: '32px',
                padding: '0 12px',
                fontSize: '12px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              退出
            </Button>
          </>
        )}
      </Space>

      {/* 添加支付弹窗组件 */}
      <PaymentModal 
        visible={paymentModalVisible} 
        onClose={() => setPaymentModalVisible(false)}
        defaultPackage={defaultPackage}
      />
      
      {/* 添加支付历史弹窗 */}
      <PaymentHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onRefreshOrderStatus={throttledRefreshOrderStatus}
      />
    </div>
  );
};

export default HomeNavbar;
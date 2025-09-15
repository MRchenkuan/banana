import React, { useState } from 'react';
import { Space, Spin, Button, Typography } from 'antd';
import { LogoutOutlined, WalletOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useToken } from '../../contexts/TokenContext';
import PaymentModal from '../PaymentModal/PaymentModal';

const { Text } = Typography;

const HomeNavbar = ({ sdkLoading }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const { balance } = useToken();
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');

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
    setDefaultPackage('standard'); // 设置默认套餐
    setPaymentModalVisible(true);
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
            {/* Token 余额显示 - 添加点击事件和鼠标悬停效果 */}
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
              <WalletOutlined style={{ color: '#fff', fontSize: '14px' }} />
              <Text style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
                {typeof balance === 'number' ? balance.toLocaleString() : '0'} Tokens
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
      />
    </div>
  );
};

export default HomeNavbar;
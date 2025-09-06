import React from 'react';
import { Button, Space, Spin } from 'antd';
import { useAuth } from '../../contexts/AuthContext';

const HomeNavbar = ({ onLoginClick, onRegisterClick, sdkLoading }) => {
  const { isAuthenticated } = useAuth();

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

  const loginButtonStyle = {
    height: '56px',
    fontSize: '18px',
    fontWeight: 'bold',
    padding: '0 32px',
    borderRadius: '28px',
    background: 'rgba(255, 255, 255, 0.9)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    color: '#666',
    boxShadow: '0 6px 24px rgba(255, 255, 255, 0.2)',
    transition: 'all 0.3s ease',
    position: 'relative',
    zIndex: 2,
    marginLeft: '16px'
  };

  return (
    <div style={navbarStyle}>
      <div style={logoStyle}>🍌 Banana AI</div>
      <Space>
        {/* SDK 加载状态指示 */}
        {sdkLoading && (
          <Spin size="small" style={{ color: '#fff' }} />
        )}
        {!isAuthenticated && (
          <Button 
            style={loginButtonStyle}
            onClick={onLoginClick}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
              e.target.style.boxShadow = '0 8px 32px rgba(255, 255, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
              e.target.style.boxShadow = '0 6px 24px rgba(255, 255, 255, 0.2)';
            }}
          >
            登录
          </Button>
        )}
      </Space>
    </div>
  );
};

export default HomeNavbar;
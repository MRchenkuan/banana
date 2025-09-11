import React from 'react';
import { Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import LoginComponent from '../components/LoginComponent';

const { Title, Text } = Typography;

const Login = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = (result) => {
    navigate('/chat');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '40px 32px',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ 
            fontSize: '56px', 
            marginBottom: '20px',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}>🍌</div>
          <Title level={2} style={{ 
            margin: '0 0 8px 0', 
            color: '#1890ff',
            fontSize: '28px',
            fontWeight: '600'
          }}>
            Banana AI
          </Title>
          <Text type="secondary" style={{
            fontSize: '16px',
            color: '#666666'
          }}>你的创作助手</Text>
        </div>

        <LoginComponent 
          onLoginSuccess={handleLoginSuccess}
          showWechatSDK={true}
          compact={false}
        />
      </div>
    </div>
  );
};

export default Login;
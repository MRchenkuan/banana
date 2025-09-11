import React from 'react';
import { Card, Typography, Space, Divider, Button } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
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
      <Card
        style={{
          width: '100%',
          maxWidth: '800px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍌</div>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            Banana AI Chat
          </Title>
          <Text type="secondary">香蕉 AI 绘图创作助手</Text>
        </div>

        <LoginComponent 
          onLoginSuccess={handleLoginSuccess}
          showWechatSDK={true}
          compact={false}
        />

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Space>
            <Text>还没有账号？</Text>
            <Link to="/register">
              <Button type="link" style={{ padding: 0 }}>
                立即注册
              </Button>
            </Link>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default Login;
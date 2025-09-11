import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Button, Spin, Result, Typography, Space } from 'antd';
import { WechatOutlined, CheckCircleOutlined, ExclamationCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// 在开发环境中引入vconsole
if (process.env.NODE_ENV === 'development') {
  import('vconsole').then(VConsole => {
    new VConsole.default();
  });
}

const { Title, Paragraph } = Typography;

function WechatQRScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [isWechatBrowser, setIsWechatBrowser] = useState(false);
  
  const scene = searchParams.get('scene');
  
  // 检测是否在微信浏览器中
  const checkWechatBrowser = () => {
    const ua = navigator.userAgent.toLowerCase();
    return ua.includes('micromessenger');
  };
  
  useEffect(() => {
    // 首先检查是否在微信浏览器中
    const inWechat = checkWechatBrowser();
    setIsWechatBrowser(inWechat);
    
    if (!inWechat) {
      setError('请在微信中打开此页面');
      setStatus('error');
      return;
    }
    
    if (!scene) {
      setError('无效的二维码');
      setStatus('error');
      return;
    }
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
      // 未登录，跳转到微信授权
      initiateWechatLogin();
    } else {
      // 已登录，直接确认登录
      confirmQRLogin();
    }
  }, [scene]);
  
  const initiateWechatLogin = async () => {
    try {
      // 构建回调地址
      const redirectUri = `${window.location.origin}/wechat/callback?scene=${scene}`;
      
      // 调用后端接口获取授权URL
      const response = await api.post('/wechat/auth/oauth-url', {
        scope: 'snsapi_userinfo',
        state: scene,
        redirectUri: redirectUri
      });
      
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('获取授权URL失败');
      }
    } catch (error) {
      console.error('获取微信授权URL失败:', error);
      setError('获取授权链接失败');
      setStatus('error');
    }
  };
  
  const confirmQRLogin = async () => {
    try {
      setStatus('confirming');
      
      const response = await api.post('/wechat/auth/qr-confirm', {
        scene: scene
      });
      
      if (response.success) {
        setStatus('success');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        throw new Error(response.message || '确认登录失败');
      }
    } catch (error) {
      console.error('确认二维码登录失败:', error);
      setError(error.message || '确认登录失败');
      setStatus('error');
    }
  };
  
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#1890ff' }} spin />} />}
            title={<Title level={3} style={{ color: '#1890ff' }}>正在处理登录请求</Title>}
            subTitle={<Paragraph style={{ fontSize: '16px', color: '#666' }}>请稍候，我们正在为您准备登录...</Paragraph>}
          />
        );
      
      case 'confirming':
        return (
          <Result
            icon={<Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: '#52c41a' }} spin />} />}
            title={<Title level={3} style={{ color: '#52c41a' }}>正在确认登录</Title>}
            subTitle={<Paragraph style={{ fontSize: '16px', color: '#666' }}>即将完成登录，请稍候...</Paragraph>}
          />
        );
      
      case 'success':
        return (
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />}
            title={<Title level={3} style={{ color: '#52c41a' }}>登录成功！</Title>}
            subTitle={<Paragraph style={{ fontSize: '16px', color: '#666' }}>正在跳转到主页，请稍候...</Paragraph>}
          />
        );
      
      case 'error':
        return (
          <Result
            status="error"
            icon={<ExclamationCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />}
            title={<Title level={3} style={{ color: 'rgb(7, 193, 96)' }}>{error || '扫码失败'}</Title>}
            subTitle={<Paragraph style={{ fontSize: '16px', color: '#666' }}>请重新扫码</Paragraph>}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Card
        style={{
          width: '100%',
          maxWidth: '500px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          border: 'none'
        }}
        bodyStyle={{ padding: '40px 32px' }}
      >
        {status !== 'error' && (
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Space direction="vertical" size="small">
            <WechatOutlined style={{ fontSize: '48px', color: '#07c160' }} />
            <Title level={2} style={{ margin: '16px 0 8px 0', color: '#262626' }}>
              微信扫码登录
            </Title>
            <Paragraph style={{ fontSize: '16px', color: '#8c8c8c', margin: 0 }}>
              安全便捷的登录方式
            </Paragraph>
          </Space>
        </div>
        )}
        {renderContent()}
      </Card>
    </div>
  );
}

export default WechatQRScan;
import React, { useState, useEffect } from 'react';
import { Button, Typography, message } from 'antd';
import { WechatOutlined } from '@ant-design/icons';
import wechatSDK from '../utils/wechatSDK';
import api from '../services/api';

const { Title, Text } = Typography;

const LoginComponent = ({ onLoginSuccess, showWechatSDK = false, compact = false, visible = true }) => {
  const [isWechatEnv, setIsWechatEnv] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);

  useEffect(() => {
    // 检测微信环境
    const checkWechatEnv = () => {
      const ua = navigator.userAgent.toLowerCase();
      return ua.includes('micromessenger');
    };
    
    const wechatEnv = checkWechatEnv();
    setIsWechatEnv(wechatEnv);
    
    if (wechatEnv && showWechatSDK) {
      // 初始化微信SDK
      wechatSDK.init()
        .then(() => {
          setIsSDKReady(true);
        })
        .catch(error => {
          console.error('微信SDK初始化失败:', error);
        });
    }
  }, [showWechatSDK]);

  const handleWechatSDKLogin = async () => {
    if (!isSDKReady) {
      message.warning('微信SDK未就绪，请稍后重试');
      return;
    }
    
    setWechatLoading(true);
    try {
      await wechatSDK.login();
      onLoginSuccess && onLoginSuccess({ success: true });
    } catch (error) {
      console.error('微信登录失败:', error);
      message.error('微信登录失败，请重试');
    } finally {
      setWechatLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    try {
      setWechatLoading(true);
      
      // 构建回调地址
      const redirectUri = `${window.location.origin}/wechat-login-callback`;
      
      // 调用后端接口获取授权URL
      const response = await api.post('/wechat/auth/oauth-url', {
        scope: 'snsapi_login',
        state: Date.now().toString(),
        redirectUri: redirectUri
      });
      
      if (response.data.authUrl) {
        // 直接跳转到微信开放平台授权页面
        window.location.href = response.data.authUrl;
      } else {
        throw new Error('获取授权URL失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      message.error('微信登录失败，请重试');
    } finally {
      setWechatLoading(false);
    }
  };

  const cardStyle = {
    padding: compact ? '24px' : '32px',
    textAlign: 'center',
    maxWidth: compact ? '320px' : '380px',
    margin: '0 auto',
    background: 'transparent'
  };

  const titleStyle = {
    fontSize: compact ? '20px' : '24px',
    margin: '20px 0 16px 0',
    color: '#07c160',
    fontWeight: '600'
  };

  return (
    <div>
      {/* 微信登录 */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '32px' }}>
          <WechatOutlined style={{ 
            fontSize: compact ? '40px' : '48px', 
            color: '#07c160',
            marginBottom: '16px',
            display: 'block'
          }} />
          <Title level={compact ? 4 : 3} style={titleStyle}>
            微信登录
          </Title>
          <Text type="secondary" style={{ 
            fontSize: compact ? '14px' : '15px',
            color: '#666666',
            lineHeight: '1.5'
          }}>
            使用微信扫描二维码快速登录
          </Text>
        </div>
        <Button
          type="primary"
          size="large"
          loading={wechatLoading}
          onClick={handleWechatLogin}
          style={{
            width: '100%',
            height: compact ? '48px' : '52px',
            background: 'linear-gradient(135deg, #07c160 0%, #00a854 100%)',
            borderColor: '#07c160',
            fontSize: compact ? '16px' : '17px',
            fontWeight: '500',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(7, 193, 96, 0.2)'
          }}
        >
          {wechatLoading ? '正在跳转...' : '🔐 微信扫码登录'}
        </Button>
      </div>
    </div>
  );
};

export default LoginComponent;

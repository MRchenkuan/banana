import React, { useEffect, useState } from 'react';
import { Spin, Result, Button } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const WechatCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // 这里是scene值
  const scene = searchParams.get('scene') || state;
  
  useEffect(() => {
    if (code) {
      handleWechatLogin();
    } else {
      setError('授权失败，未获取到授权码');
      setStatus('error');
    }
  }, [code]);
  
  const handleWechatLogin = async () => {
    try {
      setStatus('processing');
      
      // 使用授权码登录
      const response = await api.post('/wechat/auth/oauth-login', {
        code: code,
        state: state
      });
      
      if (response.success && response.data.token) {
        // 登录成功，保存token
        login(response.data.token, response.data.user);
        
        // 如果有scene，说明是二维码登录，需要确认
        if (scene) {
          await confirmQRLogin(scene);
        } else {
          // 普通登录，直接跳转
          navigate('/');
        }
      } else {
        throw new Error(response.message || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      setError(error.message || '登录失败');
      setStatus('error');
    }
  };
  
  const confirmQRLogin = async (scene) => {
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

  // 渲染不同状态的UI
  if (status === 'loading' || status === 'processing') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>
          {status === 'loading' ? '正在处理微信登录...' : '正在验证登录信息...'}
        </div>
      </div>
    );
  }

  if (status === 'confirming') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px', color: '#666' }}>
          正在确认二维码登录...
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ padding: '50px' }}>
        <Result
          status="success"
          title="登录成功"
          subTitle="即将跳转到首页..."
        />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{ padding: '50px' }}>
        <Result
          status="error"
          title="登录失败"
          subTitle={error}
          extra={[
            <Button type="primary" key="retry" onClick={() => navigate('/')}>
              返回首页
            </Button>
          ]}
        />
      </div>
    );
  }

  return null;
};

export default WechatCallback;
import React, { useEffect, useState, useRef } from 'react';
import { Spin, Result, Button } from 'antd';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const WechatCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { wechatLogin } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const isProcessingRef = useRef(false); // 添加防重复请求的标志
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const scene = searchParams.get('scene') || state;
  
  useEffect(() => {
    // 防止重复执行
    if (isProcessingRef.current) {
      return;
    }
    
    if (code) {
      isProcessingRef.current = true;
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
      const response = await api.post('/wechat/auth/callback', {
        code: code,
        state: state
      });
      
      if (response.data.success && response.data.token) {
        // 登录成功，保存token
        await wechatLogin(response.data.token, response.data.user);
        setStatus('success');
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        throw new Error(response.data.error || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      setError(error.response?.data?.error || error.message || '登录失败');
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
          subTitle="请重新登录"
        />
      </div>
    );
  }

  return null;
};

export default WechatCallback;
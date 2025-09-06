import React, { useEffect, useState } from 'react';
import { Spin, Result, Button } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const WechatCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { wechatLogin } = useAuth(); // 使用 AuthContext 的 wechatLogin
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleWechatCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      
      if (!code) {
        throw new Error('授权码缺失');
      }

      const response = await fetch('/api/wechat/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || '登录失败');
      }

      // 使用 AuthContext 的 wechatLogin 方法
      const loginResult = await wechatLogin(result.token, result.user);
      
      if (loginResult.success) {
        navigate('/chat', { replace: true });
      }
      
    } catch (error) {
      console.error('微信登录回调错误:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleWechatCallback();
  }, []);

  if (loading) {
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
          正在处理微信登录...
        </div>
      </div>
    );
  }

  if (error) {
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
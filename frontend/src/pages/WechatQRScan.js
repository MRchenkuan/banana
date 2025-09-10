import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Result, Button, Spin, message } from 'antd';
import { WechatOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import wechatSDK from '../utils/wechatSDK';

const WechatQRScan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, confirm, success, error
  const [scene, setScene] = useState('');

  useEffect(() => {
    const sceneParam = searchParams.get('scene');
    if (!sceneParam) {
      setStatus('error');
      return;
    }
    setScene(sceneParam);
    
    // 检查是否在微信环境中
    if (!wechatSDK.isInWechat()) {
      message.error('请在微信中打开此页面');
      setStatus('error');
      return;
    }
    
    setStatus('confirm');
  }, [searchParams]);

  const handleConfirm = async () => {
    try {
      setStatus('loading');
      
      // 获取微信授权码
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (!code) {
        // 如果没有授权码，跳转到微信授权
        await wechatSDK.authorize('snsapi_userinfo');
        return;
      }
      
      // 发送确认请求到后端
      const response = await fetch('/api/wechat/qr-confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scene,
          code
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.status === 'confirmed') {
        setStatus('success');
        message.success('登录确认成功！');
        
        // 3秒后关闭页面
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        throw new Error(result.message || '确认失败');
      }
    } catch (error) {
      console.error('确认登录失败:', error);
      message.error(error.message || '确认登录失败');
      setStatus('error');
    }
  };

  const handleCancel = () => {
    window.close();
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Result
            icon={<Spin size="large" />}
            title="正在处理中..."
            subTitle="请稍候，正在确认您的登录请求"
          />
        );
      
      case 'confirm':
        return (
          <Result
            icon={<WechatOutlined style={{ color: '#07c160', fontSize: '72px' }} />}
            title="确认登录 Banana AI"
            subTitle="请确认是否要登录到 Banana AI 平台"
            extra={[
              <Button 
                key="confirm" 
                type="primary" 
                size="large"
                onClick={handleConfirm}
                style={{ 
                  background: '#07c160', 
                  borderColor: '#07c160',
                  marginRight: '12px'
                }}
              >
                确认登录
              </Button>,
              <Button 
                key="cancel" 
                size="large"
                onClick={handleCancel}
              >
                取消
              </Button>
            ]}
          />
        );
      
      case 'success':
        return (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            status="success"
            title="登录成功！"
            subTitle="您已成功登录 Banana AI，页面将自动关闭"
          />
        );
      
      case 'error':
        return (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            status="error"
            title="登录失败"
            subTitle="登录过程中出现错误，请重试"
            extra={[
              <Button key="retry" type="primary" onClick={() => window.location.reload()}>
                重试
              </Button>,
              <Button key="close" onClick={handleCancel}>
                关闭
              </Button>
            ]}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f2f5'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '40px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '90%'
      }}>
        {renderContent()}
      </div>
    </div>
  );
};

export default WechatQRScan;
import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { QRCode, Spin, Button, message } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import wechatSDK from '../utils/wechatSDK';
import api from '../services/api';
import UrlConfig from '../utils/urlConfig';

const QRCodeLogin = forwardRef(({ onLoginSuccess, style = {}, visible = true }, ref) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { wechatLogin } = useAuth();
  const pollIntervalRef = useRef(null);

  // 暴露清理方法给父组件
  useImperativeHandle(ref, () => ({
    clearPolling: clearPollInterval,
    regenerateQR: generateQRCode
  }));

  useEffect(() => {
    if (visible) {
      generateQRCode();
    } else {
      clearPollInterval();
    }
    
    return () => {
      clearPollInterval();
    };
  }, [visible]);

  // 清理轮询定时器
  const clearPollInterval = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      console.log('二维码轮询已清理');
    }
  };

  // 生成二维码登录
  const generateQRCode = async () => {
    // 防止重复调用
    if (loading) {
      console.log('二维码正在生成中，跳过重复调用');
      return;
    }
    
    try {
      // 先清理之前的轮询
      clearPollInterval();
      
      setLoading(true);
      
      // 使用配置工具获取当前baseUrl
      const currentBaseUrl = UrlConfig.getCurrentDomainUrl();
      
      const response = await api.post('/wechat/auth/qr-login', {
        baseUrl: currentBaseUrl
      });
      const data = response.data;
      
      console.log('后端返回数据:', data);
      console.log('使用的baseUrl:', currentBaseUrl);
      const { qrUrl, scene } = data;
      
      if (!qrUrl) {
        throw new Error('后端未返回二维码URL');
      }
      
      setQrCodeUrl(qrUrl);
      
      // 只有在组件可见时才开始轮询
      if (visible) {
        pollQRCodeStatus(scene);
      }
    } catch (error) {
      console.error('生成二维码失败:', error);
      message.error('生成二维码失败，请重试: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 轮询二维码状态
  const pollQRCodeStatus = (scene) => {
    // 确保之前的轮询已清理
    clearPollInterval();
    
    console.log('开始轮询二维码状态, scene:', scene);
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/wechat/auth/qr-status/${scene}`);
        const { status, user } = response.data;
        
        console.log('轮询状态:', status);
        
        if (status === 'confirmed') {
          clearPollInterval();
          console.log('二维码登录成功:', user);
          
          // 调用微信登录处理
          const loginResult = await wechatLogin(user);
          if (loginResult.success) {
            onLoginSuccess && onLoginSuccess(loginResult);
          }
        } else if (status === 'expired') {
          clearPollInterval();
          message.warning('二维码已过期，请重新获取');
          // 添加延迟，避免立即重新生成
          setTimeout(() => {
            if (visible && !loading) {
              generateQRCode();
            }
          }, 1000);
        }
      } catch (error) {
        console.error('轮询二维码状态失败:', error);
        // 网络错误时不清理轮询，继续尝试
      }
    }, 2000);
  };

  // 手动刷新二维码
  const handleRefresh = () => {
    generateQRCode();
  };

  return (
    <div style={{ textAlign: 'center', ...style }}>
      {loading ? (
        <div style={{ padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px', color: '#666' }}>正在生成二维码...</div>
        </div>
      ) : qrCodeUrl ? (
        <div>
          <QRCode
            value={qrCodeUrl}
            size={160}
            style={{ margin: '0 auto' }}
            color="#000000"
            bgColor="#FFFFFF"
            bordered={false}
          />
          <div style={{ marginTop: '16px', color: '#666', fontSize: '12px' }}>
            请使用微信扫描二维码登录
          </div>
          <Button 
            type="link" 
            size="small" 
            onClick={handleRefresh}
            style={{ marginTop: '8px' }}
          >
            刷新二维码
          </Button>
        </div>
      ) : (
        <div style={{ padding: '40px' }}>
          <div style={{ color: '#999' }}>二维码加载失败</div>
          <Button 
            type="primary" 
            size="small" 
            onClick={handleRefresh}
            style={{ marginTop: '16px' }}
          >
            重新加载
          </Button>
        </div>
      )}
    </div>
  );
});

export default QRCodeLogin;
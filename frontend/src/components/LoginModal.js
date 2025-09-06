import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message, Space, QRCode, Spin, Divider } from 'antd';
import { UserOutlined, LockOutlined, WechatOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import wechatSDK from '../utils/wechatSDK';

const LoginModal = ({ visible, onClose, onSwitchToRegister }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [sdkLoading, setSdkLoading] = useState(true);
  const [isWechatEnv, setIsWechatEnv] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loginMethod, setLoginMethod] = useState('wechat');
  const { login, wechatLogin } = useAuth();

  // 初始化微信 SDK
  useEffect(() => {
    if (visible) {
      initWechatSDK();
    }
  }, [visible]);

  const initWechatSDK = async () => {
    const inWechat = wechatSDK.isInWechat();
    setIsWechatEnv(inWechat);
    
    if (inWechat) {
      try {
        setSdkLoading(true);
        await wechatSDK.init();
        setIsSDKReady(true);
        setLoginMethod('wechat-sdk');
      } catch (error) {
        console.error('微信 SDK 初始化失败:', error);
        setLoginMethod('qrcode');
      } finally {
        setSdkLoading(false);
      }
    } else {
      setLoginMethod('qrcode');
      setSdkLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setQrCodeUrl('');
    setLoading(false);
    setWechatLoading(false);
    onClose();
  };

  // 传统登录
  const handleLogin = async (values) => {
    try {
      setLoading(true);
      await login(values.username, values.password);
      message.success('登录成功！');
      handleClose();
    } catch (error) {
      message.error(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 微信 JS-SDK 一键登录
  const handleWechatSDKLogin = async () => {
    if (!isWechatEnv || !isSDKReady) {
      message.error('微信环境未就绪');
      return;
    }

    try {
      setWechatLoading(true);
      await wechatSDK.authorize('snsapi_userinfo');
    } catch (error) {
      setWechatLoading(false);
      message.error('微信登录失败: ' + error.message);
    }
  };

  // 生成二维码登录
  const generateQRCode = async () => {
    try {
      const response = await fetch('/api/wechat/qr-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const { qrCodeUrl, scene } = await response.json();
      setQrCodeUrl(qrCodeUrl);
      
      // 开始轮询检查扫码状态
      pollQRCodeStatus(scene);
    } catch (error) {
      message.error('生成二维码失败，请重试');
    }
  };

  // 轮询二维码扫描状态
  const pollQRCodeStatus = (scene) => {
    if (!scene || scene === 'undefined') {
      message.error('二维码场景值无效');
      return;
    }
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/wechat/qr-status/${scene}`);
        const { status, token, user } = await response.json();
        
        if (status === 'scanned') {
          message.info('已扫描，请在手机上确认登录');
        } else if (status === 'confirmed') {
          clearInterval(pollInterval);
          const result = await wechatLogin(token, user);
          if (result.success) {
            handleClose();
          }
        } else if (status === 'expired') {
          clearInterval(pollInterval);
          message.warning('二维码已过期，请重新获取');
          generateQRCode();
        } else if (status === 'error') {
          clearInterval(pollInterval);
          message.error('二维码状态检查失败');
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
        message.error('检查登录状态失败');
      }
    }, 2000);
    
    // 5分钟后停止轮询
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 300000);
  };

  // 切换登录方式
  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    if (method === 'qrcode') {
      generateQRCode();
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍌</div>
          <div style={{ fontSize: '18px', color: '#1890ff' }}>登录 Banana AI</div>
        </div>
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={400}
      centered
      styles={{
        body: { padding: '24px' }
      }}
    >
      {/* 登录方式选择 */}
      {isWechatEnv && (
        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <Space>
            <Button 
              type={loginMethod === 'wechat-sdk' ? 'primary' : 'default'}
              size="small"
              icon={<WechatOutlined />}
              onClick={() => switchLoginMethod('wechat-sdk')}
              disabled={!isSDKReady}
            >
              微信授权
            </Button>
            <Button 
              type={loginMethod === 'qrcode' ? 'primary' : 'default'}
              size="small"
              icon={<QrcodeOutlined />}
              onClick={() => switchLoginMethod('qrcode')}
            >
              扫码登录
            </Button>
          </Space>
        </div>
      )}

      {/* 微信 JS-SDK 授权登录 */}
      {loginMethod === 'wechat-sdk' && isWechatEnv && (
        <div>
          <Button
            type="primary"
            size="large"
            loading={wechatLoading}
            onClick={handleWechatSDKLogin}
            disabled={!isSDKReady}
            style={{
              width: '100%',
              height: '48px',
              background: '#07c160',
              borderColor: '#07c160',
              fontSize: '16px',
              marginBottom: '16px'
            }}
          >
            {wechatLoading ? '正在授权...' : '🔐 微信一键登录'}
          </Button>
          <div style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
            {isSDKReady ? '点击按钮进行微信授权登录' : '正在初始化微信环境...'}
          </div>
        </div>
      )}

      {/* 二维码扫码登录 */}
      {loginMethod === 'qrcode' && (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 0'
        }}>
          {qrCodeUrl ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '16px',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <QRCode value={qrCodeUrl} size={200} />
              </div>
              <div style={{ 
                color: '#666', 
                fontSize: '14px',
                textAlign: 'center'
              }}>
                请使用微信扫描二维码登录
              </div>
              <Button 
                type="link" 
                size="small"
                onClick={generateQRCode}
              >
                刷新二维码
              </Button>
            </div>
          ) : (
            <div style={{ 
              padding: '40px', 
              color: '#666',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Spin size="large" />
              <span>正在生成二维码...</span>
            </div>
          )}
        </div>
      )}

      {/* 分割线 */}
      <Divider>或</Divider>

      {/* 传统登录表单 */}
      <Form
        form={form}
        onFinish={handleLogin}
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: '请输入用户名或邮箱' }
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="用户名或邮箱"
            size="large"
          />
        </Form.Item>
        
        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            size="large"
          />
        </Form.Item>
        
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            style={{ width: '100%' }}
          >
            登录
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <span style={{ color: '#666' }}>还没有账号？</span>
        <Button 
          type="link" 
          onClick={() => {
            handleClose();
            onSwitchToRegister();
          }}
          style={{ padding: 0, marginLeft: '8px' }}
        >
          立即注册
        </Button>
      </div>

      {/* 环境提示信息 */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px', 
        background: '#f6f6f6', 
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666'
      }}>
        {isWechatEnv ? (
          isSDKReady ? (
            '✅ 微信环境就绪，支持一键登录'
          ) : (
            '⏳ 正在初始化微信环境...'
          )
        ) : (
          '📱 请在微信中打开或使用扫码登录'
        )}
      </div>
    </Modal>
  );
};

export default LoginModal;
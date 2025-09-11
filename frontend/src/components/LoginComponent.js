import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Typography, Row, Col, message } from 'antd';
import { UserOutlined, LockOutlined, QrcodeOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import QRCodeLogin from './QRCodeLogin';
import wechatSDK from '../utils/wechatSDK';

const { Title, Text } = Typography;

const LoginComponent = ({ onLoginSuccess, showWechatSDK = false, compact = false, visible = true }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [isWechatEnv, setIsWechatEnv] = useState(false);
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const { login } = useAuth();
  const qrCodeRef = useRef(null);

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

  // 当组件不可见时清理二维码轮询
  useEffect(() => {
    if (!visible && qrCodeRef.current) {
      // 通知QRCodeLogin组件清理轮询
      qrCodeRef.current.clearPolling && qrCodeRef.current.clearPolling();
    }
  }, [visible]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (qrCodeRef.current) {
        qrCodeRef.current.clearPolling && qrCodeRef.current.clearPolling();
      }
    };
  }, []);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);
      if (result.success) {
        message.success('登录成功!');
        onLoginSuccess && onLoginSuccess(result);
      }
    } catch (error) {
      console.error('登录错误:', error);
      message.error(error.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

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

  const handleQRLoginSuccess = (result) => {
    message.success('登录成功!');
    onLoginSuccess && onLoginSuccess(result);
  };

  const cardStyle = {
    padding: compact ? '16px' : '24px',
    border: '1px solid #f0f0f0',
    borderRadius: '8px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const titleStyle = {
    fontSize: compact ? '16px' : '18px',
    margin: '8px 0',
    color: '#1890ff'
  };

  return (
    <div>
      {/* 微信环境一键登录 */}
      {isWechatEnv && showWechatSDK && (
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
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

      {/* 左右布局的登录方式 */}
      <Row gutter={compact ? 16 : 32} align="stretch">
        {/* 左侧：二维码登录 */}
        <Col xs={24} md={12}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <QrcodeOutlined style={{ fontSize: compact ? '20px' : '24px', color: '#1890ff' }} />
              <Title level={compact ? 5 : 4} style={titleStyle}>
                扫码登录
              </Title>
              <Text type="secondary" style={{ fontSize: compact ? '12px' : '14px' }}>
                使用微信扫描二维码快速登录
              </Text>
            </div>
            <QRCodeLogin 
              ref={qrCodeRef}
              onLoginSuccess={handleQRLoginSuccess}
              style={{ minHeight: compact ? '150px' : '200px' }}
              visible={visible}
            />
          </div>
        </Col>

        {/* 右侧：传统登录表单 */}
        <Col xs={24} md={12}>
          <div style={cardStyle}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <UserOutlined style={{ fontSize: compact ? '20px' : '24px', color: '#1890ff' }} />
              <Title level={compact ? 5 : 4} style={titleStyle}>
                账号登录
              </Title>
              <Text type="secondary" style={{ fontSize: compact ? '12px' : '14px' }}>
                使用用户名和密码登录
              </Text>
            </div>
            
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
                  size={compact ? 'middle' : 'large'}
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
                  size={compact ? 'middle' : 'large'}
                />
              </Form.Item>
              
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  size={compact ? 'middle' : 'large'}
                  style={{ width: '100%' }}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default LoginComponent;
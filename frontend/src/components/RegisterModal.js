import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined, MessageOutlined } from '@ant-design/icons';

const RegisterModal = ({ visible, onClose, onSwitchToLogin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    form.resetFields();
    setLoading(false);
    onClose();
  };

  const handleRegister = async (values) => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: values.username,
          email: values.email,
          password: values.password
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        message.success('注册成功！请登录');
        handleClose();
        onSwitchToLogin();
      } else {
        throw new Error(data.message || '注册失败');
      }
    } catch (error) {
      message.error(error.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍌</div>
          <div style={{ fontSize: '18px', color: '#52c41a' }}>注册 Banana AI</div>
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
      <Form
        form={form}
        onFinish={handleRegister}
        layout="vertical"
      >
        <Form.Item
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, message: '用户名至少3个字符' },
            { max: 20, message: '用户名最多20个字符' }
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="用户名"
            size="large"
          />
        </Form.Item>
        
        <Form.Item
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' }
          ]}
        >
          <Input
            prefix={<MessageOutlined />}
            placeholder="邮箱"
            size="large"
          />
        </Form.Item>
        
        <Form.Item
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 6, message: '密码至少6个字符' }
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="密码"
            size="large"
          />
        </Form.Item>
        
        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: '请确认密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              }
            })
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="确认密码"
            size="large"
          />
        </Form.Item>
        
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            size="large"
            style={{ 
              width: '100%',
              background: '#52c41a',
              borderColor: '#52c41a'
            }}
          >
            注册
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <span style={{ color: '#666' }}>已有账号？</span>
        <Button 
          type="link" 
          onClick={() => {
            handleClose();
            onSwitchToLogin();
          }}
          style={{ padding: 0, marginLeft: '8px' }}
        >
          立即登录
        </Button>
      </div>
    </Modal>
  );
};

export default RegisterModal;
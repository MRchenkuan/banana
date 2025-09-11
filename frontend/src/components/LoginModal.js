import React, { useState, useEffect, useRef } from 'react';
import { Modal, Divider, Space, Button } from 'antd';
import { Link } from 'react-router-dom';
import LoginComponent from './LoginComponent';

const LoginModal = ({ visible, onClose, onSwitchToRegister }) => {
  const handleLoginSuccess = (result) => {
    onClose();
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
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      styles={{
        body: { padding: '24px' }
      }}
    >
      <LoginComponent 
        onLoginSuccess={handleLoginSuccess}
        showWechatSDK={true}
        compact={true}
        visible={visible}
      />

      <Divider />

      <div style={{ textAlign: 'center' }}>
        <Space>
          <span>还没有账号？</span>
          <Button 
            type="link" 
            onClick={onSwitchToRegister}
            style={{ padding: 0 }}
          >
            立即注册
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

export default LoginModal;
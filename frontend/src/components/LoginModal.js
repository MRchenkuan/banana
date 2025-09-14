import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'antd';
import LoginComponent from './LoginComponent';

const LoginModal = ({ visible, onClose, onSwitchToRegister }) => {
  const handleLoginSuccess = (result) => {
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      className="login-modal"
      maskStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          fontSize: '56px', 
          marginBottom: '20px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
        }}>🍌</div>
        <div style={{ 
          fontSize: '28px', 
          color: '#1890ff',
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>Banana AI</div>
        <div style={{
          fontSize: '16px',
          color: '#666666'
        }}>你的创作助手</div>
      </div>
      
      <LoginComponent 
        onLoginSuccess={handleLoginSuccess}
        showWechatSDK={true}
        compact={false}
        visible={visible}
      />
    </Modal>
  );
};

export default LoginModal;
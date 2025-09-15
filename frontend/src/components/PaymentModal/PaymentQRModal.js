import React from 'react';
import { Modal, Typography, Space, QRCode, Spin, Result } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';
import styles from './PaymentQRModal.module.css';

const { Text } = Typography;

// 格式化时间
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 支付二维码弹窗
export const PaymentQRModal = ({ 
  visible, 
  onClose, 
  paymentMethod, 
  paymentStatus, 
  qrCodeUrl, 
  countdown, 
  selectedPackage, 
  packages 
}) => {
  return (
    <Modal
      title={paymentMethod === 'wechat' ? "微信支付" : "支付宝支付"}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      centered
      className={styles.paymentQrcodeModal}
      destroyOnClose
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {paymentStatus === 'pending' && (
          <Space direction="vertical" size="large">
            <div>
              <Text>请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫描二维码完成支付</Text>
              <br />
              <Text type="secondary">
                支付金额: ¥{packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}
              </Text>
            </div>
            
            {qrCodeUrl && (
              <QRCode
                value={qrCodeUrl}
                size={200}
                style={{ margin: '20px 0' }}
              />
            )}
            
            <div>
              <Text type="secondary">
                剩余时间: {formatTime(countdown)}
              </Text>
            </div>
            
            <Spin size="small" />
            <Text type="secondary">等待支付中...</Text>
          </Space>
        )}
        
        {paymentStatus === 'success' && (
          <Space direction="vertical" size="large">
            <div style={{ color: '#52c41a', fontSize: '48px' }}>✓</div>
            <Text style={{ fontSize: '18px', color: '#52c41a' }}>支付成功！</Text>
            <Text type="secondary">Token 已充值到您的账户</Text>
          </Space>
        )}
        
        {paymentStatus === 'failed' && (
          <Space direction="vertical" size="large">
            <div style={{ color: '#ff4d4f', fontSize: '48px' }}>✗</div>
            <Text style={{ fontSize: '18px', color: '#ff4d4f' }}>支付失败</Text>
            <Text type="secondary">请重新发起支付</Text>
          </Space>
        )}
      </div>
    </Modal>
  );
};

// 支付宝iframe弹窗
export const AlipayIframeModal = ({ 
  visible, 
  onClose, 
  alipayFormUrl, 
  countdown, 
  selectedPackage, 
  packages 
}) => {
  return (
    <Modal
      title="支付宝支付"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={300}
      centered
      className={styles.alipayModal}
      destroyOnClose
    >
      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <div>
          <Text>请在下方完成支付</Text>
          <br />
          <Text type="secondary">
            支付金额: ¥{packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}
          </Text>
        </div>
        
        {alipayFormUrl && (
          <div style={{ margin: '10px 0' }}>
            <iframe 
              src={alipayFormUrl}
              width="200"
              height="200"
              frameBorder="0"
              scrolling="no"
              title="支付宝支付"
            />
          </div>
        )}
        
        <div style={{ marginTop: '10px' }}>
          <Text type="secondary">支付倒计时: {formatTime(countdown)}</Text>
        </div>
      </div>
    </Modal>
  );
};

// 支付成功弹窗
export const PaymentSuccessModal = ({ visible, onClose, successTokens }) => {
  return (
    <Modal
      open={visible}
      closable={false}
      footer={null}
      centered
      width={400}
      bodyStyle={{ 
        padding: '30px 40px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, #f8f8f8, #ffffff)'
      }}
    >
      <Result
        icon={<CheckCircleFilled style={{ color: '#52c41a', fontSize: 70 }} />}
        title="支付成功"
        subTitle={`您的账户已成功充值 ${successTokens.toLocaleString()} 个Tokens`}
        status="success"
        style={{ padding: 0 }}
        extra={[
          <button 
            type="button" 
            key="console" 
            onClick={onClose}
            style={{
              background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(82, 196, 26, 0.3)',
              transition: 'all 0.3s ease'
            }}
          >
            确定
          </button>
        ]}
      />
    </Modal>
  );
};
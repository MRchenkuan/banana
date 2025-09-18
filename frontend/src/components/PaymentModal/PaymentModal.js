import React, { useState, useEffect } from 'react';
import { Modal, Button, Typography, Space, Divider, Tag, message, Tooltip } from 'antd';
import { AlipayOutlined, HistoryOutlined, WechatOutlined } from '@ant-design/icons';
import { usePayment } from '../../hooks/usePayment';
import { PaymentQRModal, AlipayIframeModal, PaymentSuccessModal } from './PaymentQRModal';
import PaymentHistory from './PaymentHistory';
import PackageCards from './PackageCards';
import api from '../../services/api';
import GlassPanel from '../GlassPanel';
import styles from './PaymentModal.module.css';

const { Title } = Typography;

const PaymentModal = ({ visible, onClose }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentMethod] = useState('alipay'); // 固定为支付宝
  const [historyVisible, setHistoryVisible] = useState(false);

  const {
    paymentState,
    handlePayment,
    closePaymentModal,
    closeAlipayModal,
    throttledRefreshOrderStatus
  } = usePayment();

  // 获取套餐列表
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.payment.getPackages();
        if (response.data.success) {
          setPackages(response.data.data);
        }
      } catch (error) {
        console.error('获取套餐列表失败:', error);
        message.error('获取套餐列表失败');
      }
    };

    if (visible) {
      fetchPackages();
    }
  }, [visible]);

  // 处理支付按钮点击
  const onPaymentClick = () => {
    if (!selectedPackage) {
      message.warning('请先选择充值套餐');
      return;
    }
    handlePayment(selectedPackage, packages, paymentMethod);
  };

  // 获取支付历史记录
  const fetchPaymentHistory = () => {
    setHistoryVisible(true);
  };

  return (
    <>
      <Modal
        title={null}
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        centered
        // 使用 afterClose 属性来处理关闭后的清理工作
        afterClose={() => {
          setSelectedPackage(null);
          setPackages([]);
        }}
        className={styles.modalContent}
        styles={{
          body: { padding: 0 },
          content: { background: 'transparent', boxShadow: 'none' }
        }}
      >
        <GlassPanel 
          blur={20}
          opacity={0.15}
          gradientIntensity="high"
          shadow={true}
        >
          <div style={{ padding: '24px' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* 套餐选择组件 */}
              <PackageCards 
                packages={packages}
                selectedPackage={selectedPackage}
                onPackageSelect={setSelectedPackage}
              />

              <Divider style={{ margin: '16px 0', borderColor: 'rgba(255, 255, 255, 0.2)' }} />
              
              {/* 支付方式选择 */}
              <div>
                <Title level={4} style={{ marginBottom: '12px', color: '#ffffff' }}>选择支付方式</Title>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Tag icon={<AlipayOutlined />} color="#1677ff" style={{ padding: '8px 16px', fontSize: '14px' }}>
                    支付宝
                  </Tag>
                  <Tooltip title="暂不支持微信支付" placement="top">
                    <Tag 
                      icon={<WechatOutlined />} 
                      color="default" 
                      style={{ 
                        padding: '8px 16px', 
                        fontSize: '14px',
                        opacity: 0.5,
                        cursor: 'not-allowed',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}
                    >
                      微信支付
                    </Tag>
                  </Tooltip>
                </div>
              </div>

              {/* 支付按钮 */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<AlipayOutlined />}
                  loading={paymentState.loading}
                  onClick={onPaymentClick}
                  className={styles.payButton}
                >
                  支付宝支付 {selectedPackage ? `¥${packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}` : '请先选择套餐'}
                </Button>
              </div>

              {/* 充值记录按钮 */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Button
                  type="default"
                  size="large"
                  onClick={fetchPaymentHistory}
                  className={styles.historyButton}
                >
                  <span style={{ marginRight: '8px' }}>查看充值记录</span>
                  <HistoryOutlined spin={paymentState.loading} />
                </Button>
              </div>
            </Space>
          </div>
        </GlassPanel>
      </Modal>

      {/* 支付二维码弹窗 */}
      <PaymentQRModal
        visible={paymentState.paymentModal}
        onClose={closePaymentModal}
        paymentMethod={paymentMethod}
        paymentStatus={paymentState.paymentStatus}
        qrCodeUrl={paymentState.qrCodeUrl}
        countdown={paymentState.countdown}
        selectedPackage={selectedPackage}
        packages={packages}
        setSelectedPackage={setSelectedPackage}  // 添加这个prop
        setPackages={setPackages}               // 添加这个prop
      />

      {/* 支付宝iframe弹窗 */}
      <AlipayIframeModal
        visible={paymentState.alipayIframeVisible}
        onClose={closeAlipayModal}
        alipayFormUrl={paymentState.alipayFormUrl}
        countdown={paymentState.countdown}
        selectedPackage={selectedPackage}
        packages={packages}
        setSelectedPackage={setSelectedPackage}  // 添加这个prop
        setPackages={setPackages}               // 添加这个prop
      />

      {/* 支付成功弹窗 */}
      <PaymentSuccessModal
        visible={paymentState.successModalVisible}
        onClose={() => {
          onClose();
        }}
        successTokens={paymentState.successTokens}
      />

      {/* 支付历史弹窗 */}
      <PaymentHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onRefreshOrderStatus={throttledRefreshOrderStatus}
      />
    </>
  );
};

export default PaymentModal;


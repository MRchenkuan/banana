import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Radio,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  message,
  QRCode,
  Spin,
  List,
  Tag
} from 'antd';
import {
  WechatOutlined,
  CrownOutlined,
  RocketOutlined,
  StarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useToken } from '../contexts/TokenContext';
import api from '../services/api';
import PaymentService from '../services/PaymentService';

const { Title, Text } = Typography;

const PaymentModal = ({ visible, onClose }) => {  // 移除 defaultPackage 参数
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);  // 初始值改为 null
  const [loading, setLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [countdown, setCountdown] = useState(300);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  
  const { refreshTokens } = useToken();
  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // 倒计时
  useEffect(() => {
    if (paymentModal && paymentStatus === 'pending') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setPaymentModal(false);
            setPaymentStatus('timeout');
            message.error('支付超时，请重新发起支付');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [paymentModal, paymentStatus]);

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

  const handlePayment = async () => {
    if (!packages || packages.length === 0) {
      message.error('套餐列表为空，请稍后再试');
      return;
    }

    const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
    if (!selectedPkg) {
      message.error('请选择有效的套餐');
      return;
    }

    setLoading(true);
    try {
      const response = await api.payment.createPaymentOrder(selectedPkg.id);

      if (response.data.success) {
        setOrderId(response.data.orderId);
        setQrCodeUrl(response.data.qrCodeUrl);
        setPaymentModal(true);
        setPaymentStatus('pending');
        setCountdown(300);
        
        startPaymentPolling(response.data.orderId);
      } else {
        message.error(response.data.message || '创建订单失败');
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      message.error('创建订单失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (orderId) => {
    pollIntervalRef.current = setInterval(async () => {
      try {
        // 先主动调用更新订单状态接口
        const updateResponse = await api.payment.updateOrderStatus(orderId);
        
        // 如果更新接口返回支付成功，直接处理成功逻辑
        if (updateResponse.data.success && updateResponse.data.status === 'completed') {
          setPaymentStatus('success');
          clearInterval(pollIntervalRef.current);
          message.success('支付成功！');
          refreshTokens();
          setTimeout(() => {
            setPaymentModal(false);
            onClose();
          }, 2000);
          return;
        }
        
        // 如果更新接口未返回成功，继续查询订单状态
        const response = await api.payment.getOrderStatus(orderId);
        if (response.data.success) {
          const { status } = response.data;
          if (status === 'paid') {
            setPaymentStatus('success');
            clearInterval(pollIntervalRef.current);
            message.success('支付成功！');
            refreshTokens();
            setTimeout(() => {
              setPaymentModal(false);
              onClose();
            }, 2000);
          } else if (status === 'failed' || status === 'cancelled') {
            setPaymentStatus('failed');
            clearInterval(pollIntervalRef.current);
            message.error('支付失败');
          }
        }
      } catch (error) {
        console.error('检查支付状态失败:', error);
      }
    }, 3000);
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await api.payment.getPaymentHistory();
      if (response.data.success) {
        setPaymentHistory(response.data.payments);
        setHistoryVisible(true);
      }
    } catch (error) {
      console.error('获取充值记录失败:', error);
      message.error('获取充值记录失败');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Modal
        title="充值中心"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        destroyOnClose
      >
        <div style={{ padding: '20px 0' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* 套餐选择 */}
            <div>
              <Title level={4}>选择充值套餐</Title>
              <Radio.Group
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                style={{ width: '100%' }}
              >
                <Row gutter={[16, 16]}>
                  {packages.map(pkg => (
                    <Col key={pkg.id} xs={24} sm={12} md={12} lg={6}>
                      <Card
                        hoverable
                        className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage(pkg.id)}
                      >
                        <div className="package-icon">{getIconForPackage(pkg.id)}</div>
                        <Title level={4}>{pkg.name}</Title>
                        <Text className="package-price">¥{pkg.amount}</Text>
                        <div className="package-tokens">{pkg.tokens} Tokens</div>
                        <Text type="secondary">{pkg.description}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
            </div>

            <Divider />

            {/* 支付按钮 */}
            <div style={{ textAlign: 'center' }}>
              <Button
                type="primary"
                size="large"
                icon={<WechatOutlined />}
                loading={loading}
                onClick={handlePayment}
                style={{
                  background: 'linear-gradient(135deg, #07c160 0%, #05a050 100%)',
                  borderColor: 'transparent',
                  height: '56px',
                  fontSize: '16px',
                  borderRadius: '16px',
                  minWidth: '240px',
                  boxShadow: '0 8px 24px rgba(7, 193, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 32px rgba(7, 193, 96, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 24px rgba(7, 193, 96, 0.3)';
                }}
              >
                微信支付 {selectedPackage ? `¥${packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}` : '请先选择套餐'}
              </Button>
            </div>

            {/* 充值记录按钮 */}
            <div style={{ textAlign: 'center' }}>
              <Button type="link" onClick={fetchPaymentHistory}>
                查看充值记录
              </Button>
            </div>
          </Space>
        </div>
      </Modal>

      {/* 支付二维码弹窗 */}
      <Modal
        title="微信支付"
        open={paymentModal}
        onCancel={() => setPaymentModal(false)}
        footer={null}
        width={400}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {paymentStatus === 'pending' && (
            <Space direction="vertical" size="large">
              <div>
                <Text>请使用微信扫描二维码完成支付</Text>
                <br />
                <Text type="secondary">支付金额: ¥{packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}</Text>
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

      {/* 充值记录弹窗 */}
      <Modal
        title="充值记录"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={600}
      >
        <List
          dataSource={paymentHistory}
          renderItem={item => (
            <List.Item>
              <List.Item.Meta
                title={`${item.package} - ¥${item.amount}`}
                description={`${(item.tokens / 10000).toFixed(0)}万 Tokens | ${new Date(item.createdAt).toLocaleString()}`}
              />
              <Tag color={item.status === 'paid' ? 'green' : item.status === 'pending' ? 'orange' : 'red'}>
                {item.status === 'paid' ? '已完成' : item.status === 'pending' ? '待支付' : '已失败'}
              </Tag>
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

// 根据套餐ID返回对应图标
const getIconForPackage = (packageId) => {
  const icons = {
    'basic': <StarOutlined />,
    'standard': <CrownOutlined />,
    'premium': <RocketOutlined />,
    'enterprise': <ThunderboltOutlined />
  };
  return icons[packageId] || <StarOutlined />;
};

export default PaymentModal;
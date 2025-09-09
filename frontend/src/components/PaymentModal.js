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

const { Title, Text } = Typography;

// 充值套餐配置 - 橙色紫色渐变主题
const PAYMENT_PACKAGES = [
  {
    id: 'basic',
    name: '基础套餐',
    amount: 10,
    tokens: 100000,
    description: '适合轻度使用',
    icon: <StarOutlined />,
    color: '#ff8c42', // 橙色
    gradient: 'linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)',
    popular: false
  },
  {
    id: 'standard',
    name: '标准套餐',
    amount: 30,
    tokens: 350000,
    description: '最受欢迎的选择',
    icon: <CrownOutlined />,
    color: '#a855f7', // 紫色
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
    popular: true
  },
  {
    id: 'premium',
    name: '高级套餐',
    amount: 50,
    tokens: 600000,
    description: '高频使用用户',
    icon: <RocketOutlined />,
    color: '#f97316', // 深橙色
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    popular: false
  },
  {
    id: 'enterprise',
    name: '企业套餐',
    amount: 100,
    tokens: 1300000,
    description: '企业级解决方案',
    icon: <ThunderboltOutlined />,
    color: '#8b5cf6', // 亮紫色
    gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
    popular: false
  }
];

const PaymentModal = ({ visible, onClose, defaultPackage = 'standard' }) => {
  const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
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

  const handlePayment = async () => {
    const selectedPkg = PAYMENT_PACKAGES.find(pkg => pkg.id === selectedPackage);
    if (!selectedPkg) return;

    setLoading(true);
    try {

      const response = await api.payment.createPaymentOrder({ amount: selectedPkg.amount });

      if (response.data.success) {
        setOrderId(response.data.orderId);
        setQrCodeUrl(response.data.qrCodeUrl);
        setPaymentModal(true);
        setPaymentStatus('pending');
        setCountdown(300);
        
        // 开始轮询支付状态
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

  const selectedPkg = PAYMENT_PACKAGES.find(pkg => pkg.id === selectedPackage);

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
                  {PAYMENT_PACKAGES.map(pkg => (
                    <Col span={12} key={pkg.id}>
                      <Radio.Button
                        value={pkg.id}
                        style={{
                          width: '100%',
                          height: 'auto',
                          padding: 0,
                          border: selectedPackage === pkg.id ? `2px solid ${pkg.color}` : '1px solid #d9d9d9'
                        }}
                      >
                        <Card
                          size="small"
                          style={{
                            border: 'none',
                            background: selectedPackage === pkg.id 
                              ? `linear-gradient(135deg, ${pkg.color}15 0%, ${pkg.color}25 100%)` 
                              : 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
                            borderRadius: '12px',
                            transition: 'all 0.3s ease',
                            boxShadow: selectedPackage === pkg.id 
                              ? `0 8px 32px ${pkg.color}40` 
                              : '0 4px 16px rgba(0,0,0,0.3)'
                          }}
                          bodyStyle={{ padding: '20px' }}
                        >
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space>
                                <div style={{ 
                                  background: pkg.gradient,
                                  borderRadius: '8px',
                                  padding: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <span style={{ color: '#ffffff', fontSize: '18px' }}>
                                    {pkg.icon}
                                  </span>
                                </div>
                                <Text strong style={{ color: '#ffffff' }}>{pkg.name}</Text>
                              </Space>
                              {pkg.popular && (
                                <Tag 
                                  style={{
                                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                                    border: 'none',
                                    color: '#ffffff',
                                    borderRadius: '20px',
                                    padding: '4px 12px'
                                  }}
                                >
                                  🔥 热门
                                </Tag>
                              )}
                            </div>
                            <div>
                              <Text style={{ 
                                fontSize: '28px', 
                                fontWeight: 'bold', 
                                background: pkg.gradient,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text'
                              }}>
                                ¥{pkg.amount}
                              </Text>
                              <Text style={{ 
                                marginLeft: 8, 
                                color: 'rgba(255,255,255,0.7)',
                                fontSize: '14px'
                              }}>
                                {(pkg.tokens / 10000).toFixed(0)}万 Tokens
                              </Text>
                            </div>
                            <Text style={{ 
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.6)'
                            }}>
                              {pkg.description}
                            </Text>
                          </Space>
                        </Card>
                      </Radio.Button>
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
                💳 微信支付 ¥{selectedPkg?.amount}
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
                <Text type="secondary">支付金额: ¥{selectedPkg?.amount}</Text>
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

export default PaymentModal;
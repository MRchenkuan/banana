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
  AlipayOutlined,
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
  const [paymentMethod, setPaymentMethod] = useState('wechat'); // 添加这一行
  const [loading, setLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [countdown, setCountdown] = useState(300);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  // 添加支付宝iframe相关状态
  const [alipayIframeVisible, setAlipayIframeVisible] = useState(false);
  const [alipayFormUrl, setAlipayFormUrl] = useState('');
  
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
    if ((paymentModal || alipayIframeVisible) && paymentStatus === 'pending') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setPaymentModal(false);
            setAlipayIframeVisible(false);
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
  }, [paymentModal, alipayIframeVisible, paymentStatus]);

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

  // 修改startPaymentPolling方法以支持iframe模式
  const startPaymentPolling = (orderId, method = 'wechat') => {
    // 设置轮询间隔为3秒
    const pollInterval = 3000;
    // 设置最大轮询时间为5分钟
    const maxPollTime = 5 * 60 * 1000;
    const startTime = Date.now();
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        // 检查是否超时
        if (Date.now() - startTime > maxPollTime) {
          clearInterval(pollIntervalRef.current);
          message.error('支付超时，请重新发起支付');
          setAlipayIframeVisible(false); // 关闭iframe弹窗
          setPaymentModal(false);
          return;
        }
        
        // 先主动调用更新订单状态接口
        const updateResponse = await api.payment.updateOrderStatus(orderId, method);
        
        // 如果更新接口返回支付成功，直接处理成功逻辑
        if (updateResponse.data.success && updateResponse.data.status === 'completed') {
          setPaymentStatus('success');
          clearInterval(pollIntervalRef.current);
          message.success('支付成功！');
          refreshTokens();
          setTimeout(() => {
            setAlipayIframeVisible(false); // 关闭iframe弹窗
            setPaymentModal(false);
            onClose();
          }, 2000);
          return;
        }
        
        // 如果更新接口未返回成功，继续查询订单状态
        const response = await api.payment.getOrderStatus(orderId, method);
        if (response.data.success) {
          const { status } = response.data;
          if (status === 'paid') {
            setPaymentStatus('success');
            clearInterval(pollIntervalRef.current);
            message.success('支付成功！');
            refreshTokens();
            setTimeout(() => {
              setAlipayIframeVisible(false); // 关闭iframe弹窗
              setPaymentModal(false);
              onClose();
            }, 2000);
          }
        }
      } catch (error) {
        console.error('查询支付状态失败:', error);
      }
    }, pollInterval);
  };

  // 修改handlePayment方法以支持不同支付方式
  const handlePayment = async () => {
    setLoading(true);
    try {
      if (!packages || packages.length === 0) {
        message.error('套餐列表为空，请稍后再试');
        return;
      }

      const selectedPkg = packages.find(pkg => pkg.id === selectedPackage);
      if (!selectedPkg) {
        message.error('请选择有效的套餐');
        return;
      }
      
      // 根据选择的支付方式调用不同的API
      let response;
      if (paymentMethod === 'wechat') {
        response = await api.payment.createWechatPaymentOrder(selectedPkg.id);
        
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
      } else if (paymentMethod === 'alipay') {
        // 获取当前页面URL作为返回地址
        
        response = await api.payment.createAlipayOrder(selectedPkg.id);
        
        if (response.data.success) {
          // 设置订单ID和支付状态
          setOrderId(response.data.orderId);
          setPaymentStatus('pending');
          setCountdown(300);
          
          // 从返回的HTML中提取表单提交URL和参数
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = response.data.formHtml;
          
          const form = tempDiv.querySelector('form');
          if (form) {
            // 获取表单的action URL
            const formAction = form.getAttribute('action');
            
            // 收集表单参数
            const formData = new FormData(form);
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
              params.append(key, value);
            }
            
            // 构建完整的URL（包含参数）
            const fullUrl = `${formAction}?${params.toString()}`;
            
            // 设置iframe URL并显示iframe弹窗
            setAlipayFormUrl(fullUrl);
            setAlipayIframeVisible(true);
            
            // 开始轮询支付结果
            startPaymentPolling(response.data.orderId, 'alipay');
          } else {
            message.error('支付表单加载失败');
          }
        } else {
          message.error(response.data.message || '创建订单失败');
        }
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      message.error('创建订单失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取支付历史记录
  const fetchPaymentHistory = async () => {
    try {
      const response = await api.payment.getPaymentHistory();
      if (response.data.success) {
        setPaymentHistory(response.data.data);
        setHistoryVisible(true);
      }
    } catch (error) {
      console.error('获取充值记录失败:', error);
      message.error('获取充值记录失败');
    }
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 在渲染部分添加支付方式选择
  return (
    <>
      <Modal
        title="充值中心"
        open={visible}
        onCancel={onClose}
        footer={null}
        width={800}
        destroyOnClose
        className="payment-modal"
        centered
      >
        <div style={{ padding: '10px 0' }}> {/* 减少上下内边距 */}
          <Space direction="vertical" size="middle" style={{ width: '100%' }}> {/* 将size从large改为middle */}
            {/* 套餐选择 */}
            <div>
              <Title level={3} style={{ textAlign: 'center', marginBottom: '12px', color: '#ffffff' }}> {/* 减少下边距 */}
                选择充值套餐
              </Title>
              <Radio.Group
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                style={{ width: '100%' }}
              >
                <Row gutter={[12, 12]} justify="center"> {/* 减少Row的gutter间距 */}
                  {packages.map(pkg => (
                    <Col key={pkg.id} xs={24} sm={12} md={8} lg={6}>
                      <Card
                        hoverable
                        className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''}`}
                        onClick={() => setSelectedPackage(pkg.id)}
                        bordered={false}
                      >
                        <div className="package-icon">{getIconForPackage(pkg.id)}</div>
                        <Title level={4}>{pkg.name}</Title>
                        <Text className="package-price">¥{pkg.amount}</Text>
                        <div className="package-tokens">{pkg.tokens.toLocaleString()} Tokens</div>
                        <Text type="secondary" style={{ fontSize: '12px', opacity: 0.8 }}>{pkg.description}</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
            </div>

            <Divider style={{ margin: '8px 0' }} /> {/* 减少分割线上下边距 */}
            
            {/* 支付方式选择 */}
            <div>
              <Title level={4} style={{ marginBottom: '8px' }}>选择支付方式</Title> {/* 减少下边距 */}
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ marginBottom: '12px' }}
              >
                <Radio.Button value="wechat">
                  <WechatOutlined style={{ marginRight: '8px', color: '#07c160' }} />
                  微信支付
                </Radio.Button>
                <Radio.Button value="alipay">
                  <AlipayOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
                  支付宝
                </Radio.Button>
              </Radio.Group>
            </div>

            {/* 支付按钮 */}
            <div style={{ textAlign: 'center', marginTop: '8px' }}> {/* 减少上边距 */}
              <Button
                type="primary"
                size="large"
                icon={paymentMethod === 'wechat' ? <WechatOutlined /> : <AlipayOutlined />}
                loading={loading}
                onClick={handlePayment}
                style={{
                  background: paymentMethod === 'wechat' 
                    ? 'linear-gradient(135deg, #07c160 0%, #05a050 100%)'
                    : 'linear-gradient(135deg, #1677ff 0%, #0e5fd9 100%)',
                  borderColor: 'transparent',
                  height: '50px', /* 减少按钮高度 */
                  fontSize: '18px',
                  borderRadius: '16px',
                  minWidth: '280px',
                  boxShadow: paymentMethod === 'wechat'
                    ? '0 12px 28px rgba(7, 193, 96, 0.4)'
                    : '0 12px 28px rgba(22, 119, 255, 0.4)',
                  transition: 'all 0.3s ease',
                  fontWeight: '600'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = paymentMethod === 'wechat'
                    ? '0 16px 36px rgba(7, 193, 96, 0.5)'
                    : '0 16px 36px rgba(22, 119, 255, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = paymentMethod === 'wechat'
                    ? '0 12px 28px rgba(7, 193, 96, 0.4)'
                    : '0 12px 28px rgba(22, 119, 255, 0.4)';
                }}
              >
                {paymentMethod === 'wechat' ? '微信支付' : '支付宝支付'} {selectedPackage ? `¥${packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}` : '请先选择套餐'}
              </Button>
            </div>

            {/* 充值记录按钮 */}
            <div style={{ textAlign: 'center', marginTop: '4px' }}> {/* 减少上边距 */}
              <Button type="link" onClick={fetchPaymentHistory}>
                查看充值记录
              </Button>
            </div>
          </Space>
        </div>
      </Modal>

      {/* 支付宝iframe弹窗 */}
      <Modal
        title="支付宝支付"
        open={alipayIframeVisible}
        onCancel={() => setAlipayIframeVisible(false)}
        footer={null}
        width={300}
        centered
      >
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div>
            <Text>请在下方完成支付</Text>
            <br />
            <Text type="secondary">支付金额: ¥{packages.find(pkg => pkg.id === selectedPackage)?.amount || '--'}</Text>
          </div>
          
          {alipayFormUrl && (
            <div style={{ margin: '10px 0' }}>
              <iframe 
                src={alipayFormUrl}
                width="800"
                height="450"
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

      {/* 支付二维码弹窗 */}
      <Modal
        title={paymentMethod === 'wechat' ? "微信支付" : "支付宝支付"}
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
                <Text>请使用{paymentMethod === 'wechat' ? '微信' : '支付宝'}扫描二维码完成支付</Text>
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
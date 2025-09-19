import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, List, Tag, Typography, Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Text } = Typography;

const PaymentHistory = ({ visible, onClose, onRefreshOrderStatus }) => {
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(new Set());
  const lastRefreshTime = useRef({});

  // 获取支付历史记录
  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const response = await api.payment.getPaymentHistory();
      if (response.data.success) {
        setPaymentHistory(response.data.data);
      }
    } catch (error) {
      console.error('获取充值记录失败:', error);
      message.error('获取充值记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchPaymentHistory();
    }
  }, [visible]);

  // 处理刷新订单状态 - 添加节流处理
  const handleRefreshOrderStatus = useCallback(async (orderId, paymentMethod) => {
    const now = Date.now();
    const throttleDelay = 3000; // 3秒节流
    const orderKey = `${orderId}_${paymentMethod}`;
    
    // 检查是否在节流时间内
    if (lastRefreshTime.current[orderKey] && now - lastRefreshTime.current[orderKey] < throttleDelay) {
      return;
    }
    
    // 检查是否正在刷新中
    if (refreshingOrders.has(orderKey)) {
      return;
    }
    
    try {
      // 标记为刷新中
      setRefreshingOrders(prev => new Set(prev).add(orderKey));
      lastRefreshTime.current[orderKey] = now;
      
      // 调用父组件的刷新函数
      if (onRefreshOrderStatus) {
        const result = await onRefreshOrderStatus(orderId, paymentMethod);
        
        // 如果刷新成功，立即更新当前列表中的对应订单状态
        if (result && result.success) {
          setPaymentHistory(prevHistory => 
            prevHistory.map(item => 
              item.orderId === orderId ? { ...item, status: result.status || 'paid' } : item
            )
          );
        }
      }
      
      // 无论成功与否，都重新获取完整的历史记录列表
      await fetchPaymentHistory();
    } catch (error) {
      console.error('刷新订单状态失败:', error);
      message.error('刷新订单状态失败');
    } finally {
      // 移除刷新中标记
      setRefreshingOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderKey);
        return newSet;
      });
    }
  }, [onRefreshOrderStatus, fetchPaymentHistory]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return 'green';
      case 'pending':
        return 'orange';
      case 'failed':
        return 'red';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return '已完成';
      case 'pending':
        return '未支付';
      case 'failed':
        return '已失败';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  };

  return (
    <Modal
      title="充值记录"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={645}
      centered
      style={{ 
        zIndex: 1100,
        maxHeight: '80vh',
        overflowY: 'auto',
        borderRadius: '10px'
       }}
      // 使用 unmountOnExit 替代已弃用的 destroyOnClose
      unmountOnExit
      className="modal-scrollable"

    >
      <List
        loading={loading}
        dataSource={paymentHistory}
        renderItem={(item) => {
          const orderKey = `${item.orderId}_${item.paymentMethod}`;
          const isRefreshing = refreshingOrders.has(orderKey);
          
          return (
            <List.Item style={{ display: 'flex', justifyContent: 'space-between' }}>
              <List.Item.Meta
                style={{ flex: 1, marginRight: '24px' }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 500 }}>{`${item.package || '充值套餐'} - ¥${item.amount}`}</span>
                    <span style={{ color: '#8BC34A', marginLeft: '16px' }}>{`+ ${item.tokens?.toLocaleString()} 能量`}</span>
                  </div>
                }
                description={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#666', fontSize: '13px' }}>
                      {item.paymentMethod === 'wechat' ? '微信支付' : '支付宝'} • 订单编号: {item.orderId}
                    </span>
                    <span style={{ color: '#999', fontSize: '13px', marginLeft: '16px' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </div>
                }
              />
              <div>
                {item.status === 'pending' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<SyncOutlined spin={isRefreshing} />}
                    onClick={() => handleRefreshOrderStatus(item.orderId, item.paymentMethod)}
                    loading={isRefreshing}
                    style={{ marginRight: '8px' }}
                  >
                    刷新
                  </Button>
                )}
                <Tag color={getStatusColor(item.status)}>
                  {getStatusText(item.status)}
                </Tag>
              </div>
            </List.Item>
          );
        }}
        locale={{ emptyText: '暂无充值记录' }}
      />
    </Modal>
  );
};

export default PaymentHistory;
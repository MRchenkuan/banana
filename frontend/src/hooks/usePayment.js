import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import api from '../services/api';

// 节流Hook
export const useThrottle = (fn, delay) => {
  const lastCall = useRef(0);
  
  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      fn(...args);
      lastCall.current = now;
    }
  }, [fn, delay]);
};

// 支付逻辑Hook
export const usePayment = () => {
  const [paymentState, setPaymentState] = useState({
    loading: false,
    paymentModal: false,
    qrCodeUrl: '',
    orderId: '',
    paymentStatus: 'pending',
    countdown: 300,
    alipayIframeVisible: false,
    alipayFormUrl: '',
    successModalVisible: false,
    successTokens: 0
  });

  const pollIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if ((paymentState.paymentModal || paymentState.alipayIframeVisible) && paymentState.paymentStatus === 'pending') {
      countdownIntervalRef.current = setInterval(() => {
        setPaymentState(prev => ({
          ...prev,
          countdown: prev.countdown <= 1 ? (() => {
            setPaymentState(current => ({
              ...current,
              paymentModal: false,
              alipayIframeVisible: false,
              paymentStatus: 'timeout'
            }));
            message.error('支付超时，请重新发起支付');
            return 0;
          })() : prev.countdown - 1
        }));
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [paymentState.paymentModal, paymentState.alipayIframeVisible, paymentState.paymentStatus]);

  // 开始支付轮询
  const startPaymentPolling = useCallback((orderId, method = 'wechat') => {
    const pollInterval = 3000;
    const maxPollTime = 5 * 60 * 1000;
    const startTime = Date.now();
    let failureCount = 0;
    const maxFailures = 5;
    
    if (!orderId) {
      message.error('订单ID无效，无法查询支付状态');
      return;
    }
    
    pollIntervalRef.current = setInterval(async () => {
      try {
        if (Date.now() - startTime > maxPollTime) {
          clearInterval(pollIntervalRef.current);
          message.error('支付超时，请重新发起支付');
          setPaymentState(prev => ({
            ...prev,
            alipayIframeVisible: false,
            paymentModal: false
          }));
          return;
        }
        
        const response = await api.payment.getOrderStatus(orderId, method);
        failureCount = 0;
        
        if (response.data.success) {
          const { status, tokensAdded } = response.data;
          
          if (status === 'paid' || status === 'completed') {
            clearTimers();
            setPaymentState(prev => ({
              ...prev,
              paymentStatus: 'success',
              alipayIframeVisible: false,
              paymentModal: false
            }));
            message.success('支付成功！');
          }
        }
      } catch (error) {
        console.error('查询支付状态失败:', error);
        failureCount++;
        
        if (failureCount >= maxFailures) {
          clearInterval(pollIntervalRef.current);
          message.error('查询支付状态失败，请稍后在个人中心查看订单状态');
          setPaymentState(prev => ({
            ...prev,
            alipayIframeVisible: false,
            paymentModal: false
          }));
        }
      }
    }, pollInterval);
  }, [clearTimers]);

  // 处理支付
  const handlePayment = useCallback(async (selectedPackage, packages, paymentMethod) => {
    setPaymentState(prev => ({ ...prev, loading: true }));
    
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
      
      let response;
      if (paymentMethod === 'wechat') {
        response = await api.payment.createWechatPaymentOrder(selectedPkg.id);
        
        if (response.data.success) {
          setPaymentState(prev => ({
            ...prev,
            orderId: response.data.orderId,
            qrCodeUrl: response.data.qrCodeUrl,
            paymentModal: true,
            paymentStatus: 'pending',
            countdown: 300
          }));
          
          startPaymentPolling(response.data.orderId);
        } else {
          message.error(response.data.message || '创建订单失败');
        }
      } else if (paymentMethod === 'alipay') {
        response = await api.payment.createAlipayOrder(selectedPkg.id);
        
        if (response.data.success) {
          setPaymentState(prev => ({
            ...prev,
            orderId: response.data.orderId,
            paymentStatus: 'pending',
            countdown: 300,
            alipayIframeVisible: true
          }));
          
          const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>支付宝支付</title>
          </head>
          <body>
            ${response.data.formHtml}
            <script>
              document.forms[0].submit();
            </script>
          </body>
          </html>
          `;
          
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const blobUrl = URL.createObjectURL(blob);
          
          setPaymentState(prev => ({ ...prev, alipayFormUrl: blobUrl }));
          startPaymentPolling(response.data.orderId, 'alipay');
        } else {
          message.error(response.data.message || '创建订单失败');
        }
      }
    } catch (error) {
      console.error('创建订单失败:', error);
      message.error('创建订单失败，请重试');
    } finally {
      setPaymentState(prev => ({ ...prev, loading: false }));
    }
  }, [startPaymentPolling]);

  // 关闭支付弹窗
  const closePaymentModal = useCallback(() => {
    setPaymentState(prev => ({ ...prev, paymentModal: false }));
    clearTimers();
  }, [clearTimers]);

  // 关闭支付宝iframe弹窗
  const closeAlipayModal = useCallback(() => {
    setPaymentState(prev => ({ ...prev, alipayIframeVisible: false, alipayFormUrl: '' }));
    clearTimers();
    
    // 释放Blob URL
    if (paymentState.alipayFormUrl && paymentState.alipayFormUrl.startsWith('blob:')) {
      URL.revokeObjectURL(paymentState.alipayFormUrl);
    }
  }, [clearTimers, paymentState.alipayFormUrl]);

  // 刷新订单状态
  const handleRefreshOrderStatus = useCallback(async (orderId, paymentMethod) => {
    try {
      message.loading('正在查询订单状态...', 1);
      const response = await api.payment.updateOrderStatus(orderId, paymentMethod);
      
      if (response.data.success) {
        const order = response.data;
        switch (order.status) {
          case 'paid':
            message.success(`支付成功！已添加${order.tokensPurchased}个令牌到您的账户`);
            break;
          case 'pending':
            message.info('更新订单状态：支付中');
            break;
          case 'failed':
            message.error('更新订单状态：支付失败');
            break;
          case 'expired':
            message.warning('更新订单状态：已过期');
            break;
          default:
            message.info(`更新订单状态：${order.status}`);
        }
      } else {
        message.error(response.data.error || '查询订单状态失败');
      }
    } catch (error) {
      console.error('查询订单状态失败:', error);
      message.error('查询订单状态失败，请稍后再试');
    }
  }, []);

  const throttledRefreshOrderStatus = useThrottle(handleRefreshOrderStatus, 2000);

  // 清理函数
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    paymentState,
    handlePayment,
    closePaymentModal,
    closeAlipayModal,
    throttledRefreshOrderStatus,
    clearTimers
  };
};
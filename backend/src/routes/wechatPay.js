const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { PaymentRecord } = require('../utils/database');
const WechatPayService = require('../services/WechatPayService');
const router = express.Router();

const wechatPayService = new WechatPayService();

// 创建支付订单
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount = 10 } = req.body;
    const tokensToAdd = amount * 1000;
    const orderId = uuidv4().replace(/-/g, '');
    
    // 创建支付记录
    await PaymentRecord.create({
      userId: req.user.userId,
      orderId: orderId,
      amount: amount,
      tokensPurchased: tokensToAdd,
      status: 'pending'
    });

    // 调用微信统一下单
    const result = await wechatPayService.createUnifiedOrder({
      orderNo: orderId,
      amount: amount,
      description: `Banana AI Chat - ${tokensToAdd} Tokens`,
      clientIp: req.ip || '127.0.0.1'
    });

    if (result.success) {
      // 更新订单记录
      await PaymentRecord.update(
        { transactionId: result.prepayId },
        { where: { orderId: orderId } }
      );

      res.json({
        orderId,
        qrCodeUrl: result.codeUrl,
        amount,
        tokensToAdd,
        message: '支付订单创建成功，请扫码支付'
      });
    } else {
      // 开发环境模拟支付
      if (process.env.NODE_ENV === 'development') {
        res.json({
          orderId,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=mock_payment_${orderId}`,
          amount,
          tokensToAdd,
          message: '开发环境模拟支付订单创建成功'
        });
      } else {
        throw new Error(result.error);
      }
    }
  } catch (error) {
    console.error('创建支付订单错误:', error);
    res.status(500).json({ error: '创建支付订单失败' });
  }
});

// 微信支付回调
router.post('/notify', async (req, res) => {
  try {
    const result = await wechatPayService.handlePaymentCallback(req.body);
    res.set('Content-Type', 'application/xml');
    res.send(result.response);
  } catch (error) {
    console.error('微信支付回调处理错误:', error);
    res.set('Content-Type', 'application/xml');
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
  }
});

// 查询订单状态
router.get('/order-status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // 查询本地订单
    const order = await PaymentRecord.findOne({
      where: { orderId, userId: req.user.userId }
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 如果订单状态为pending，查询微信支付状态
    if (order.status === 'pending') {
      const wechatResult = await wechatPayService.queryOrder(orderId);
      
      if (wechatResult.success && wechatResult.tradeState === 'SUCCESS') {
        // 更新本地订单状态
        await order.update({
          status: 'completed',
          transactionId: wechatResult.transactionId
        });
        
        // 更新用户token余额
        const { User } = require('../utils/database');
        await User.increment('tokenBalance', {
          by: order.tokensPurchased,
          where: { id: req.user.userId }
        });
      }
    }

    res.json({
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      tokensPurchased: order.tokensPurchased,
      createdAt: order.createdAt
    });
  } catch (error) {
    console.error('查询订单状态错误:', error);
    res.status(500).json({ error: '查询订单状态失败' });
  }
});

// 模拟支付成功（仅开发环境）
router.post('/simulate-success/:orderId', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: '此接口仅在开发环境可用' });
  }

  try {
    const { orderId } = req.params;
    
    const order = await PaymentRecord.findOne({
      where: { orderId, userId: req.user.userId, status: 'pending' }
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在或已处理' });
    }

    // 更新订单状态
    await order.update({
      status: 'completed',
      transactionId: `mock_${Date.now()}`
    });

    // 更新用户token余额
    const { User } = require('../utils/database');
    await User.increment('tokenBalance', {
      by: order.tokensPurchased,
      where: { id: req.user.userId }
    });

    res.json({
      success: true,
      message: '模拟支付成功',
      tokensAdded: order.tokensPurchased
    });
  } catch (error) {
    console.error('模拟支付错误:', error);
    res.status(500).json({ error: '模拟支付失败' });
  }
});

module.exports = router;
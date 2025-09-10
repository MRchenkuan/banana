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
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { User, PaymentRecord } = require('../utils/database');
const WechatPayService = require('../services/WechatPayService');

const router = express.Router();

// 微信支付配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_PAY_APP_ID,
  mchId: process.env.WECHAT_PAY_MCH_ID,
  apiKey: process.env.WECHAT_PAY_API_KEY,
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/payment/notify'
};

// 生成微信支付签名
function generateSign(params, apiKey) {
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter(key => params[key] !== '' && key !== 'sign')
    .map(key => `${key}=${params[key]}`)
    .join('&');
  const stringSignTemp = `${stringA}&key=${apiKey}`;
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
}

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

    // 使用服务类创建订单
    const orderResult = await wechatPayService.createUnifiedOrder({
      orderId,
      amount: amount * 100, // 转换为分
      body: `Banana AI Chat - ${tokensToAdd} Tokens`,
      userId: req.user.userId
    });

    if (!orderResult.success) {
      throw new Error(orderResult.error);
    }

    res.json({
      success: true,
      orderId,
      prepayId: orderResult.prepayId,
      codeUrl: orderResult.codeUrl
    });
  } catch (error) {
    console.error('创建支付订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 微信支付回调
router.post('/notify', async (req, res) => {
  try {
    // 这里应该解析微信的 XML 回调数据
    // 简化处理，实际项目中需要验证签名和处理 XML
    console.log('微信支付回调:', req.body);
    
    // 返回成功响应给微信
    res.set('Content-Type', 'application/xml');
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
  } catch (error) {
    console.error('微信支付回调处理错误:', error);
    res.set('Content-Type', 'application/xml');
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
  }
});

// 模拟支付成功（开发环境）
router.post('/simulate-success', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: '此接口仅在开发环境可用' });
  }

  try {
    const { orderId } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ error: '订单ID不能为空' });
    }

    // 查找订单
    const order = await PaymentRecord.findOne({
      where: {
        orderId: orderId,
        userId: req.user.userId,
        status: 'pending'
      }
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在或已处理' });
    }

    // 更新订单状态
    await PaymentRecord.update(
      { 
        status: 'success',
        paidAt: new Date()
      },
      { where: { orderId: orderId } }
    );

    // 增加用户 token 余额
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const newBalance = await user.addTokens(order.tokensPurchased);

    res.json({
      message: '支付成功',
      tokensAdded: order.tokensPurchased,
      newBalance: newBalance
    });
  } catch (error) {
    console.error('模拟支付成功错误:', error);
    res.status(500).json({ error: '处理支付失败' });
  }
});

// 查询订单状态
router.get('/order-status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await PaymentRecord.findOne({
      where: {
        orderId: orderId,
        userId: req.user.userId
      }
    });

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    res.json({
      orderId: order.orderId,
      amount: order.amount,
      tokensToAdd: order.tokensPurchased,
      status: order.status,
      createdAt: order.createdAt,
      completedAt: order.paidAt
    });
  } catch (error) {
    console.error('查询订单状态错误:', error);
    res.status(500).json({ error: '查询订单状态失败' });
  }
});

module.exports = router;
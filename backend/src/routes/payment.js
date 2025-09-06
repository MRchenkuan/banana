const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { User, PaymentRecord } = require('../utils/database');

const router = express.Router();

// 微信支付配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID,
  mchId: process.env.WECHAT_MCH_ID,
  apiKey: process.env.WECHAT_API_KEY,
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'http://localhost:3001/api/payment/notify'
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

// 创建支付订单
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount = 10 } = req.body; // 默认 10 元
    const tokensToAdd = amount * 1000; // 1 元 = 1000 tokens
    const orderId = uuidv4().replace(/-/g, '');
    
    // 创建支付记录
    await PaymentRecord.create({
      userId: req.user.userId,
      orderId: orderId,
      amount: amount,
      tokensPurchased: tokensToAdd,
      status: 'pending'
    });

    // 微信统一下单参数
    const unifiedOrderParams = {
      appid: WECHAT_CONFIG.appId,
      mch_id: WECHAT_CONFIG.mchId,
      nonce_str: crypto.randomBytes(16).toString('hex'),
      body: `Banana AI Chat - ${tokensToAdd} Tokens`,
      out_trade_no: orderId,
      total_fee: amount * 100, // 微信支付金额单位为分
      spbill_create_ip: req.ip || '127.0.0.1',
      notify_url: WECHAT_CONFIG.notifyUrl,
      trade_type: 'NATIVE' // 扫码支付
    };

    // 生成签名
    unifiedOrderParams.sign = generateSign(unifiedOrderParams, WECHAT_CONFIG.apiKey);

    // 构建 XML 请求体
    const xmlData = `<xml>
      ${Object.keys(unifiedOrderParams)
        .map(key => `<${key}><![CDATA[${unifiedOrderParams[key]}]]></${key}>`)
        .join('\n      ')}
    </xml>`;

    try {
      // 调用微信统一下单接口
      const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xmlData, {
        headers: {
          'Content-Type': 'application/xml'
        }
      });

      // 解析微信返回的 XML（这里简化处理，实际项目中应该使用 XML 解析库）
      const codeUrlMatch = response.data.match(/<code_url><!\[CDATA\[(.+?)\]\]><\/code_url>/);
      const prepayIdMatch = response.data.match(/<prepay_id><!\[CDATA\[(.+?)\]\]><\/prepay_id>/);
      
      if (codeUrlMatch && prepayIdMatch) {
        const codeUrl = codeUrlMatch[1];
        const prepayId = prepayIdMatch[1];
        
        // 更新订单记录
        await PaymentRecord.update(
          { transactionId: prepayId },
          { where: { orderId: orderId } }
        );

        res.json({
          orderId,
          qrCodeUrl: codeUrl,
          amount,
          tokensToAdd,
          message: '支付订单创建成功，请扫码支付'
        });
      } else {
        throw new Error('微信支付接口返回异常');
      }
    } catch (wechatError) {
      console.error('微信支付接口错误:', wechatError);
      // 模拟支付二维码（开发环境）
      if (process.env.NODE_ENV === 'development') {
        res.json({
          orderId,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=mock_payment_${orderId}`,
          amount,
          tokensToAdd,
          message: '开发环境模拟支付订单创建成功'
        });
      } else {
        throw wechatError;
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
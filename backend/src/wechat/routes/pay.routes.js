const express = require('express');
const WechatPayController = require('../controllers/pay.controller');
const { authenticateToken } = require('../../middleware/auth');

const router = express.Router();
const payController = new WechatPayController();

// 创建支付订单
router.post('/create-order', 
  authenticateToken,
  payController.createOrder.bind(payController)
);

// 微信支付回调
router.post('/notify',
  payController.handleNotify.bind(payController)
);

// 查询订单状态
router.get('/order-status/:orderId',
  authenticateToken,
  payController.getOrderStatus.bind(payController)
);

// 模拟支付成功（仅开发环境）
router.post('/simulate-success/:orderId',
  authenticateToken,
  payController.simulateSuccess.bind(payController)
);

// 前端主动更新订单状态
router.post('/update-order-status/:orderId',
  authenticateToken,
  payController.updateOrderStatus.bind(payController)
);

module.exports = router;
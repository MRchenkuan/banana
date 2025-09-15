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


// 模拟支付成功（仅开发环境）
router.post('/simulate-success/:orderId',
  authenticateToken,
  payController.simulateSuccess.bind(payController)
);


// 查询和更新订单状态（合并接口）
router.all('/order-status/:orderId',
  authenticateToken,
  payController.checkOrderStatus.bind(payController)
);

module.exports = router;
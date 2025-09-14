const express = require('express');
const AlipayConfig = require('./config');
const payRoutes = require('./routes/pay.routes');

class AlipayModule {
  static init() {
    // 验证配置
    AlipayConfig.validate();
    
    // 创建路由
    const router = express.Router();
    
    // 注册子路由
    router.use('/pay', payRoutes);
    
    return router;
  }
  
  static getConfig() {
    return AlipayConfig.getAllConfig();
  }
}

module.exports = AlipayModule;
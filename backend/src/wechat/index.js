const express = require('express');
const WechatConfig = require('./config');
const authRoutes = require('./routes/auth.routes');
const payRoutes = require('./routes/pay.routes');

class WechatModule {
  static init() {
    // 验证配置
    WechatConfig.validate();
    
    // 创建路由
    const router = express.Router();
    
    // 注册子路由
    router.use('/auth', authRoutes);
    router.use('/pay', payRoutes);
    
    return router;
  }
  
  static getConfig() {
    return WechatConfig.getAllConfig();
  }
}

module.exports = WechatModule;
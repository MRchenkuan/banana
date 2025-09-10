const express = require('express');
const WechatAuthController = require('../controllers/auth.controller');
const { validateJSConfigParams, validateOAuthParams } = require('../middleware/validate.middleware');

const router = express.Router();
const authController = new WechatAuthController();

// JS-SDK配置
router.post('/js-config', 
  validateJSConfigParams,
  authController.getJSConfig.bind(authController)
);

// 获取OAuth授权URL
router.post('/oauth-url',
  validateOAuthParams,
  authController.generateOAuthUrl.bind(authController)
);

// OAuth回调处理
router.post('/callback',
  authController.handleOAuthCallback.bind(authController)
);

// 二维码登录相关路由
router.post('/qr-login', authController.generateQRLogin.bind(authController));
router.get('/qr-status/:scene', authController.getQRLoginStatus.bind(authController));
router.post('/qr-confirm', authController.confirmQRLogin.bind(authController));

module.exports = router;
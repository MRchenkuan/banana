const express = require('express');
const WechatAuthService = require('../services/WechatAuthService');
const router = express.Router();

const wechatAuthService = new WechatAuthService();

// JS-SDK配置
router.post('/js-config', async (req, res) => {
  try {
    const { url } = req.body;
    const config = await wechatAuthService.generateJSConfig(url);
    res.json(config);
  } catch (error) {
    console.error('获取JS-SDK配置失败:', error);
    res.status(500).json({ error: '获取JS-SDK配置失败' });
  }
});

// 获取OAuth授权URL
router.post('/oauth-url', (req, res) => {
  try {
    const { scope, state } = req.body;
    const authUrl = wechatAuthService.generateOAuthUrl(scope, state);
    res.json({ authUrl });
  } catch (error) {
    console.error('生成授权URL失败:', error);
    res.status(500).json({ error: '生成授权URL失败' });
  }
});

// OAuth回调处理
router.post('/callback', async (req, res) => {
  try {
    const { code, state } = req.body;
    const result = await wechatAuthService.handleOAuthCallback(code, state);
    res.json(result);
  } catch (error) {
    console.error('微信登录回调处理失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 生成二维码登录
router.post('/qr-login', async (req, res) => {
  try {
    const result = wechatAuthService.generateQRLogin();
    res.json(result);
  } catch (error) {
    console.error('生成二维码登录失败:', error);
    res.status(500).json({ error: '生成二维码失败' });
  }
});

// 获取二维码登录状态
router.get('/qr-status/:scene', (req, res) => {
  try {
    const { scene } = req.params;
    const result = wechatAuthService.getQRLoginStatus(scene);
    res.json(result);
  } catch (error) {
    console.error('获取二维码状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 确认二维码登录
router.post('/qr-confirm', async (req, res) => {
  try {
    const { scene, code } = req.body;
    const result = await wechatAuthService.confirmQRLogin(scene, code);
    res.json(result);
  } catch (error) {
    console.error('确认二维码登录失败:', error);
    res.status(500).json({ error: '确认登录失败' });
  }
});

module.exports = router;
const WechatAuthService = require('../services/auth.service');
const { validateAuthParams } = require('../middleware/validate.middleware');
const { v4: uuidv4 } = require('uuid');

class WechatAuthController {
  constructor() {
    this.authService = new WechatAuthService();
    this.qrLoginSessions = new Map(); // 存储二维码登录会话
  }
  
  /**
   * 获取JS-SDK配置
   */
  async getJSConfig(req, res) {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: 'URL参数必填' });
      }
      
      const config = await this.authService.generateJSConfig(url);
      res.json(config);
    } catch (error) {
      console.error('获取JS-SDK配置失败:', error);
      res.status(500).json({ error: '获取JS-SDK配置失败' });
    }
  }
  
  /**
   * 生成OAuth授权URL
   */
  generateOAuthUrl(req, res) {
    try {
      const { scope, state, redirectUri } = req.body;
      
      if (!redirectUri) {
        return res.status(400).json({ error: 'redirectUri参数必填' });
      }
      
      const authUrl = this.authService.generateOAuthUrl(scope, state, redirectUri);
      res.json({ authUrl });
    } catch (error) {
      console.error('生成授权URL失败:', error);
      res.status(500).json({ error: '生成授权URL失败' });
    }
  }
  
  /**
   * 处理OAuth回调
   */
  async handleOAuthCallback(req, res) {
    try {
      const { code, state } = req.body;
      const result = await this.authService.handleOAuthLogin(code, state);
      res.json(result);
    } catch (error) {
      console.error('微信登录回调处理失败:', error);
      res.status(500).json({ error: '登录失败' });
    }
  }

  /**
   * 生成二维码登录
   */
  async generateQRLogin(req, res) {
    try {
      const { baseUrl } = req.body; // 从请求体中获取baseUrl
      const scene = uuidv4().replace(/-/g, '').substring(0, 16);
      const expireTime = Date.now() + 5 * 60 * 1000; // 5分钟过期
      
      // 存储二维码会话信息
      this.qrLoginSessions.set(scene, {
        status: 'pending',
        expireTime,
        userInfo: null
      });
      
      // 生成二维码URL，传入前端提供的baseUrl
      const qrUrl = await this.authService.generateQRCode(scene, baseUrl);
      
      res.json({
        success: true,
        scene,
        qrUrl,
        expireTime
      });
    } catch (error) {
      console.error('生成二维码登录失败:', error);
      res.status(500).json({ 
        success: false,
        error: '生成二维码失败' 
      });
    }
  }

  /**
   * 获取二维码登录状态
   */
  async getQRLoginStatus(req, res) {
    try {
      const { scene } = req.params;
      const session = this.qrLoginSessions.get(scene);
      
      if (!session) {
        return res.json({
          success: false,
          status: 'expired',
          message: '二维码已过期'
        });
      }
      
      if (Date.now() > session.expireTime) {
        this.qrLoginSessions.delete(scene);
        return res.json({
          success: false,
          status: 'expired',
          message: '二维码已过期'
        });
      }
      
      res.json({
        success: true,
        status: session.status,
        userInfo: session.userInfo
      });
    } catch (error) {
      console.error('获取二维码状态失败:', error);
      res.status(500).json({ 
        success: false,
        error: '获取状态失败' 
      });
    }
  }

  /**
   * 确认二维码登录
   */
  async confirmQRLogin(req, res) {
    try {
      const { scene, code } = req.body;
      
      if (!scene || !code) {
        return res.status(400).json({
          success: false,
          error: '场景值和授权码必填'
        });
      }
      
      const session = this.qrLoginSessions.get(scene);
      if (!session || Date.now() > session.expireTime) {
        return res.json({
          success: false,
          error: '二维码已过期'
        });
      }
      
      // 处理微信授权
      const userInfo = await this.authService.handleOAuthLogin(code);
      
      if (userInfo.success) {
        // 更新会话状态
        session.status = 'confirmed';
        session.userInfo = userInfo;
        this.qrLoginSessions.set(scene, session);
        
        res.json({
          success: true,
          message: '登录确认成功'
        });
      } else {
        res.json({
          success: false,
          error: '登录确认失败'
        });
      }
    } catch (error) {
      console.error('确认二维码登录失败:', error);
      res.status(500).json({ 
        success: false,
        error: '确认登录失败' 
      });
    }
  }
}

module.exports = WechatAuthController;
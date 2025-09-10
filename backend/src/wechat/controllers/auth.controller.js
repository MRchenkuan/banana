const WechatAuthService = require('../services/auth.service');
const { validateAuthParams } = require('../middleware/validate.middleware');

class WechatAuthController {
  constructor() {
    this.authService = new WechatAuthService();
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
      const { scope, state } = req.body;
      const authUrl = this.authService.generateOAuthUrl(scope, state);
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
}

module.exports = WechatAuthController;
const WechatConfig = require('../config');
const WechatHttpUtil = require('../utils/http.util');
const WechatSignatureUtil = require('../utils/signature.util');
const WechatCryptoUtil = require('../utils/crypto.util');
const { User } = require('../../utils/database');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

class WechatAuthService {
  constructor() {
    this.config = WechatConfig.getAuthConfig();
    this.accessTokenCache = { token: null, expiresAt: 0 };
    this.jsapiTicketCache = { ticket: null, expiresAt: 0 };
    this.qrLoginCache = new Map();
  }
  
  /**
   * 获取访问令牌
   */
  async getAccessToken() {
    if (this.accessTokenCache.token && Date.now() < this.accessTokenCache.expiresAt) {
      return this.accessTokenCache.token;
    }
    
    const url = 'https://api.weixin.qq.com/cgi-bin/token';
    const params = {
      grant_type: 'client_credential',
      appid: this.config.appId,
      secret: this.config.appSecret
    };
    
    const result = await WechatHttpUtil.get(url, params);
    
    if (result.success && result.data.access_token) {
      this.accessTokenCache = {
        token: result.data.access_token,
        expiresAt: Date.now() + (result.data.expires_in - 300) * 1000
      };
      return result.data.access_token;
    }
    
    throw new Error('获取微信访问令牌失败');
  }
  
  /**
   * 生成JS-SDK配置
   */
  async generateJSConfig(url) {
    const ticket = await this.getJSAPITicket();
    const nonceStr = WechatCryptoUtil.generateNonceStr();
    const timestamp = WechatCryptoUtil.generateTimestamp();
    const signature = WechatSignatureUtil.generateJSSDKSign(ticket, nonceStr, timestamp, url);
    
    return {
      appId: this.config.appId,
      timestamp,
      nonceStr,
      signature
    };
  }
  
  /**
   * 生成OAuth授权URL
   * @param {string} scope - 授权范围
   * @param {string} state - 状态参数
   * @param {string} redirectUri - 前端传入的回调地址
   */
  generateOAuthUrl(scope = 'snsapi_userinfo', state, redirectUri) {
    if (!redirectUri) {
      throw new Error('redirectUri参数必填');
    }
    
    const appId = this.config.appId;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${appId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
  }

  /**
   * 处理OAuth登录
   */
  async handleOAuthLogin(code, state) {
    // 获取用户访问令牌
    const tokenResult = await this.getUserAccessToken(code);
    
    // 获取用户信息
    const userInfo = await this.getUserInfo(tokenResult.access_token, tokenResult.openid);
    
    // 处理用户登录逻辑
    return this.processUserLogin(userInfo);
  }
  
  /**
   * 生成二维码
   * @param {string} scene - 场景值
   * @param {string} baseUrl - 前端传入的baseUrl（可选）
   */
  async generateQRCode(scene, baseUrl = null) {
    try {
      console.log('开始生成自定义二维码，场景值:', scene);
      
      // 优先使用前端传入的baseUrl，其次使用环境变量，最后使用默认值
      const finalBaseUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
      const loginUrl = `${finalBaseUrl}/wechat/qr-scan?scene=${scene}`;
      
      console.log('生成的登录URL:', loginUrl);
      
      // 直接返回URL，让前端QRCode组件处理
      return loginUrl;
    } catch (error) {
      console.error('生成自定义二维码失败:', error);
      throw new Error('二维码生成失败');
    }
  }
}

module.exports = WechatAuthService;
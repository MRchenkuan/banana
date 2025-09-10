const WechatConfig = require('../config');
const WechatHttpUtil = require('../utils/http.util');
const WechatSignatureUtil = require('../utils/signature.util');
const WechatCryptoUtil = require('../utils/crypto.util');
const { User } = require('../../utils/database');
const jwt = require('jsonwebtoken');

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
  
  // ... 其他方法
}

module.exports = WechatAuthService;
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
   * 生成OAuth授权URL
   * @param {string} scope - 授权范围
   * @param {string} state - 状态参数
   * @param {string} redirectUri - 前端传入的回调地址
   */
  generateOAuthUrl(scope = 'snsapi_login', state, redirectUri) {
    if (!redirectUri) {
      throw new Error('redirectUri参数必填');
    }
    
    const appId = this.config.appId;
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    // 微信开放平台授权URL
    return `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${scope}&state=${state}#wechat_redirect`;
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
   * 获取用户访问令牌（开放平台）
   */
  async getUserAccessToken(code) {
    const url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    const params = {
      appid: this.config.appId,
      secret: this.config.appSecret,
      code: code,
      grant_type: 'authorization_code'
    };
    
    const result = await WechatHttpUtil.get(url, params);
    
    if (result.success && result.data.access_token) {
      return result.data;
    }
    
    throw new Error('获取用户访问令牌失败: ' + (result.data?.errmsg || result.error));
  }
  
  /**
   * 获取用户信息（开放平台）
   */
  async getUserInfo(accessToken, openid) {
    const url = 'https://api.weixin.qq.com/sns/userinfo';
    const params = {
      access_token: accessToken,
      openid: openid,
      lang: 'zh_CN'
    };
    
    const result = await WechatHttpUtil.get(url, params);
    
    if (result.success && result.data.openid) {
      return result.data;
    }
    
    throw new Error('获取用户信息失败: ' + (result.data?.errmsg || result.error));
  }
  
  /**
   * 处理用户登录逻辑
   */
  async processUserLogin(wechatUserInfo) {
    try {
      // 查找或创建用户
      let user = await User.findOne({
        where: { wechatOpenId: wechatUserInfo.openid }
      });
      
      if (!user) {
        // 创建新用户
        user = await User.create({
          username: wechatUserInfo.nickname || `微信用户_${wechatUserInfo.openid.slice(-8)}`,
          wechatOpenId: wechatUserInfo.openid,
          wechatUnionId: wechatUserInfo.unionid,
          wechatAvatar: wechatUserInfo.headimgurl,  // 修正字段名
          wechatNickname: wechatUserInfo.nickname,  // 修正字段名
          loginType: 'wechat',  // 添加登录类型
          tokenBalance: 100 // 新用户赠送100个token
        });
      } else {
        // 更新用户信息
        await user.update({
          wechatAvatar: wechatUserInfo.headimgurl,  // 修正字段名
          wechatNickname: wechatUserInfo.nickname,  // 修正字段名
          wechatUnionId: wechatUserInfo.unionid
        });
      }
      
      // 生成JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username,
          openId: user.wechatOpenId
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.wechatNickname,  // 修正字段名
          avatar: user.wechatAvatar,      // 修正字段名
          tokenBalance: user.tokenBalance
        }
      };
    } catch (error) {
      console.error('处理用户登录失败:', error);
      return {
        success: false,
        error: '登录处理失败'
      };
    }
  }
}

module.exports = WechatAuthService;
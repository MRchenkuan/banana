const WechatCommonUtils = require('../utils/WechatCommonUtils');
const HttpUtils = require('../utils/HttpUtils');
const jwt = require('jsonwebtoken');
const { User } = require('../utils/database');

/**
 * 微信登录服务
 * 整合所有微信登录相关功能：OAuth登录、JS-SDK、二维码登录等
 */
class WechatAuthService {
  constructor() {
    this.config = {
      appId: process.env.WECHAT_AUTH_APP_ID,
      appSecret: process.env.WECHAT_AUTH_APP_SECRET,
      redirectUri: process.env.WECHAT_AUTH_REDIRECT_URI
    };
    
    // 缓存管理
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

    const result = await HttpUtils.wechatOAuthRequest(url, params);
    
    if (result.errcode) {
      throw new Error(`获取访问令牌失败: ${result.errmsg}`);
    }

    this.accessTokenCache = {
      token: result.access_token,
      expiresAt: Date.now() + (result.expires_in - 300) * 1000
    };

    return result.access_token;
  }

  /**
   * 获取JS-SDK票据
   */
  async getJSAPITicket() {
    if (this.jsapiTicketCache.ticket && Date.now() < this.jsapiTicketCache.expiresAt) {
      return this.jsapiTicketCache.ticket;
    }

    const accessToken = await this.getAccessToken();
    const url = 'https://api.weixin.qq.com/cgi-bin/ticket/getticket';
    const params = {
      access_token: accessToken,
      type: 'jsapi'
    };

    const result = await HttpUtils.wechatOAuthRequest(url, params);
    
    if (result.errcode !== 0) {
      throw new Error(`获取JS-SDK票据失败: ${result.errmsg}`);
    }

    this.jsapiTicketCache = {
      ticket: result.ticket,
      expiresAt: Date.now() + (result.expires_in - 300) * 1000
    };

    return result.ticket;
  }

  /**
   * 生成JS-SDK配置
   * @param {string} url - 当前页面URL
   */
  async generateJSConfig(url) {
    const ticket = await this.getJSAPITicket();
    const nonceStr = WechatCommonUtils.generateNonceStr();
    const timestamp = Math.floor(Date.now() / 1000);
    
    const params = {
      jsapi_ticket: ticket,
      noncestr: nonceStr,
      timestamp: timestamp,
      url: url
    };
    
    const signature = WechatCommonUtils.generateSign(params, '', 'sha1', false);
    
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
   */
  generateOAuthUrl(scope = 'snsapi_userinfo', state = '') {
    const params = new URLSearchParams({
      appid: this.config.appId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scope,
      state: state
    });
    
    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  /**
   * 处理OAuth回调
   * @param {string} code - 授权码
   * @param {string} state - 状态参数
   */
  async handleOAuthCallback(code, state) {
    // 1. 获取访问令牌
    const tokenUrl = 'https://api.weixin.qq.com/sns/oauth2/access_token';
    const tokenParams = {
      appid: this.config.appId,
      secret: this.config.appSecret,
      code: code,
      grant_type: 'authorization_code'
    };
    
    const tokenResult = await HttpUtils.wechatOAuthRequest(tokenUrl, tokenParams);
    
    if (tokenResult.errcode) {
      throw new Error(`获取用户访问令牌失败: ${tokenResult.errmsg}`);
    }

    // 2. 获取用户信息
    const userInfoUrl = 'https://api.weixin.qq.com/sns/userinfo';
    const userInfoParams = {
      access_token: tokenResult.access_token,
      openid: tokenResult.openid,
      lang: 'zh_CN'
    };
    
    const userInfo = await HttpUtils.wechatOAuthRequest(userInfoUrl, userInfoParams);
    
    if (userInfo.errcode) {
      throw new Error(`获取用户信息失败: ${userInfo.errmsg}`);
    }

    // 3. 处理用户登录逻辑
    return this.processUserLogin(userInfo);
  }

  /**
   * 处理用户登录逻辑
   * @param {Object} wechatUserInfo - 微信用户信息
   */
  async processUserLogin(wechatUserInfo) {
    let user = await User.findOne({ where: { wechatOpenId: wechatUserInfo.openid } });
    
    if (!user) {
      // 创建新用户
      user = await User.create({
        username: `wx_${wechatUserInfo.openid.slice(-8)}`,
        wechatOpenId: wechatUserInfo.openid,
        wechatNickname: wechatUserInfo.nickname,
        wechatAvatar: wechatUserInfo.headimgurl,
        tokenBalance: 1000 // 新用户赠送1000 tokens
      });
    } else {
      // 更新用户信息
      await user.update({
        wechatNickname: wechatUserInfo.nickname,
        wechatAvatar: wechatUserInfo.headimgurl
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        wechatNickname: user.wechatNickname,
        wechatAvatar: user.wechatAvatar,
        tokenBalance: user.tokenBalance
      }
    };
  }

  /**
   * 二维码登录相关方法
   */
  
  /**
   * 生成二维码登录
   */
  generateQRLogin() {
    const scene = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/wechat-qr-scan?scene=${scene}`)}`;
    
    this.qrLoginCache.set(scene, {
      status: 'waiting',
      createdAt: Date.now(),
      token: null,
      user: null
    });
    
    // 5分钟后自动过期
    setTimeout(() => {
      if (this.qrLoginCache.has(scene)) {
        this.qrLoginCache.set(scene, {
          ...this.qrLoginCache.get(scene),
          status: 'expired'
        });
      }
    }, 300000);
    
    return { scene, qrCodeUrl };
  }

  /**
   * 获取二维码登录状态
   * @param {string} scene - 场景值
   */
  getQRLoginStatus(scene) {
    const loginData = this.qrLoginCache.get(scene);
    if (!loginData) {
      return { status: 'expired', message: '二维码已过期' };
    }
    
    return {
      status: loginData.status,
      message: this.getStatusMessage(loginData.status),
      token: loginData.token,
      user: loginData.user
    };
  }

  /**
   * 确认二维码登录
   * @param {string} scene - 场景值
   * @param {string} code - 微信授权码
   */
  async confirmQRLogin(scene, code) {
    const loginData = this.qrLoginCache.get(scene);
    if (!loginData || loginData.status !== 'waiting') {
      throw new Error('二维码已过期或状态异常');
    }

    try {
      const result = await this.handleOAuthCallback(code, scene);
      
      this.qrLoginCache.set(scene, {
        ...loginData,
        status: 'confirmed',
        token: result.token,
        user: result.user
      });
      
      return result;
    } catch (error) {
      this.qrLoginCache.set(scene, {
        ...loginData,
        status: 'error'
      });
      throw error;
    }
  }

  /**
   * 获取状态消息
   * @param {string} status - 状态
   */
  getStatusMessage(status) {
    const messages = {
      waiting: '等待扫码',
      scanned: '已扫码，等待确认',
      confirmed: '登录成功',
      expired: '二维码已过期',
      error: '登录失败'
    };
    return messages[status] || '未知状态';
  }
}

module.exports = WechatAuthService;
import api from '../services/api';

class WechatSDK {
  constructor() {
    this.isReady = false;
    this.config = null;
  }

  // 初始化微信 SDK
  async init() {
    try {
      // 获取微信 JS-SDK 配置
      const response = await api.post('/wechat/auth/js-config', {
        url: window.location.href.split('#')[0] // 当前页面URL
      });
      
      const config = await response.json();
      this.config = config;
      
      // 配置微信 JS-SDK
      window.wx.config({
        debug: false, // 生产环境设为 false
        appId: config.appId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: [
          'checkJsApi',
          'onMenuShareTimeline',
          'onMenuShareAppMessage',
          'chooseImage',
          'previewImage',
          'uploadImage',
          'downloadImage'
        ]
      });
      
      return new Promise((resolve, reject) => {
        window.wx.ready(() => {
          this.isReady = true;
          console.log('微信 JS-SDK 初始化成功');
          resolve(true);
        });
        
        window.wx.error((res) => {
          console.error('微信 JS-SDK 初始化失败:', res);
          reject(new Error('微信 JS-SDK 初始化失败'));
        });
      });
    } catch (error) {
      console.error('获取微信配置失败:', error);
      throw error;
    }
  }

  // 检查是否在微信环境中
  isInWechat() {
    return /micromessenger/i.test(navigator.userAgent);
  }

  // 检查 JS-SDK 是否就绪
  isSDKReady() {
    return this.isReady && window.wx;
  }

  // 微信授权登录
  async authorize(scope = 'snsapi_login', redirectUri = null) {
    if (!this.isInWechat()) {
      throw new Error('不在微信环境中');
    }
  
    try {
      // 使用传入的redirectUri或默认值
      const finalRedirectUri = redirectUri || (window.location.origin + '/wechat-login-callback');
      
      // 使用api.post方法，自动带上统一前缀
      const response = await api.post('/wechat/auth/oauth-url', {
        scope, // 现在默认为 snsapi_login
        redirectUri: finalRedirectUri,
        state: Date.now().toString()
      });
      
      const { authUrl } = response.data;
      
      // 跳转到微信授权页面
      window.location.href = authUrl;
    } catch (error) {
      console.error('获取授权URL失败:', error);
      throw error;
    }
  }

  // 获取用户信息（需要用户授权）
  async getUserInfo() {
    if (!this.isSDKReady()) {
      throw new Error('微信 JS-SDK 未就绪');
    }

    return new Promise((resolve, reject) => {
      // 注意：由于微信政策变化，JS-SDK 无法直接获取用户信息
      // 需要通过网页授权的方式获取
      reject(new Error('请使用网页授权方式获取用户信息'));
    });
  }

  // 分享到朋友圈
  shareToTimeline(options) {
    if (!this.isSDKReady()) {
      console.warn('微信 JS-SDK 未就绪');
      return;
    }

    window.wx.onMenuShareTimeline({
      title: options.title || 'Banana AI - 超越你的创作',
      link: options.link || window.location.href,
      imgUrl: options.imgUrl || window.location.origin + '/logo192.png',
      success: options.success || (() => {}),
      cancel: options.cancel || (() => {})
    });
  }

  // 分享给朋友
  shareToFriend(options) {
    if (!this.isSDKReady()) {
      console.warn('微信 JS-SDK 未就绪');
      return;
    }

    window.wx.onMenuShareAppMessage({
      title: options.title || 'Banana AI',
      desc: options.desc || '超越你的创作潜能',
      link: options.link || window.location.href,
      imgUrl: options.imgUrl || window.location.origin + '/logo192.png',
      success: options.success || (() => {}),
      cancel: options.cancel || (() => {})
    });
  }
}

// 创建单例实例
const wechatSDK = new WechatSDK();
export default wechatSDK;
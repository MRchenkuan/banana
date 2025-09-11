class WechatAuthConfig {
  static getConfig() {
    return {
      appId: process.env.WECHAT_AUTH_APP_ID,
      appSecret: process.env.WECHAT_AUTH_APP_SECRET,
      scope: process.env.WECHAT_AUTH_SCOPE || 'snsapi_userinfo'
    };
  }
  
  static validate() {
    const config = this.getConfig();
    const required = ['appId', 'appSecret']; // 移除 'redirectUri'
    const missing = required.filter(key => !config[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config
    };
  }
}

module.exports = WechatAuthConfig;
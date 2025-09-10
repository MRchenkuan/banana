class WechatAuthConfig {
  static getConfig() {
    return {
      appId: process.env.WECHAT_AUTH_APP_ID,
      appSecret: process.env.WECHAT_AUTH_APP_SECRET,
      redirectUri: process.env.WECHAT_AUTH_REDIRECT_URI,
      scope: process.env.WECHAT_AUTH_SCOPE || 'snsapi_userinfo'
    };
  }
  
  static validate() {
    const config = this.getConfig();
    const required = ['appId', 'appSecret', 'redirectUri'];
    const missing = required.filter(key => !config[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config
    };
  }
}

module.exports = WechatAuthConfig;
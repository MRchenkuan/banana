class WechatConfig {
  static getAuthConfig() {
    return {
      appId: process.env.WECHAT_AUTH_APP_ID,
      appSecret: process.env.WECHAT_AUTH_APP_SECRET,
      redirectUri: process.env.WECHAT_AUTH_REDIRECT_URI
    };
  }

  static getPayConfig() {
    return {
      appId: process.env.WECHAT_PAY_APP_ID,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_API_KEY,
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL
    };
  }

  static validateConfig() {
    // 配置验证逻辑
  }
}
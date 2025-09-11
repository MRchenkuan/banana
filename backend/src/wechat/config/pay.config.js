class WechatPayConfig {
  static getConfig() {
    return {
      appId: process.env.WECHAT_PAY_APP_ID,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_API_KEY,
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/wechat/pay/notify',
      tradeType: 'NATIVE', // 扫码支付
      signType: 'MD5'
    };
  }
  
  static validate() {
    const config = this.getConfig();
    const required = ['appId', 'mchId', 'apiKey', 'notifyUrl'];
    const missing = required.filter(key => !config[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config
    };
  }
}

module.exports = WechatPayConfig;
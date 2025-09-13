class WechatPayConfig {
  /**
   * 获取支付配置
   * @returns {Object} 支付配置对象
   * @returns {string} 支付配置对象.appId - 微信支付应用ID
   * @returns {string} 支付配置对象.mchId - 微信支付商户号
   * @returns {string} 支付配置对象.notifyUrl - 支付结果通知回调URL
   * @returns {string} 支付配置对象.tradeType - 交易类型，默认为'NATIVE'(扫码支付)
   * @returns {string} 支付配置对象.signType - 签名类型，默认为'MD5'
   */
  static getConfig() {
    return {
      appId: process.env.WECHAT_PAY_APP_ID,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_API_KEY||'fdsafdsafdsafd', // 添加API密钥
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/wechat/pay/notify',
      tradeType: 'NATIVE', // 扫码支付
      signType: 'MD5'
    };
  }
  
  static validate() {
    const config = this.getConfig();
    const required = ['appId', 'mchId', 'notifyUrl']; // 添加apiKey为必需项
    const missing = required.filter(key => !config[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config
    };
  }
}

module.exports = WechatPayConfig;
class AlipayConfig {
  /**
   * 获取支付宝支付配置
   * @returns {Object} 支付配置对象
   * @returns {string} 支付配置对象.appId - 支付宝应用ID
   * @returns {string} 支付配置对象.privateKey - 支付宝应用私钥
   * @returns {string} 支付配置对象.publicKey - 支付宝公钥
   * @returns {string} 支付配置对象.notifyUrl - 支付结果通知回调URL
   * @returns {string} 支付配置对象.returnUrl - 支付完成后跳转URL
   * @returns {string} 支付配置对象.gatewayUrl - 支付宝网关URL
   */
  static getConfig() {
    return {
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      publicKey: process.env.ALIPAY_PUBLIC_KEY,
      notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/api/alipay/pay/notify',
      returnUrl: process.env.ALIPAY_RETURN_URL || 'http://localhost:3000/payment/result',
      gatewayUrl: 'https://openapi.alipay.com/gateway.do', // 正式环境网关
      sandbox: process.env.NODE_ENV !== 'production' // 是否沙箱环境
    };
  }
  
  static validate() {
    const config = this.getConfig();
    const required = ['appId', 'privateKey', 'publicKey', 'notifyUrl'];
    const missing = required.filter(key => !config[key]);
    
    return {
      isValid: missing.length === 0,
      missing,
      config
    };
  }
}

module.exports = AlipayConfig;
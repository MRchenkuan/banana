const authConfig = require('./auth.config');
const payConfig = require('./pay.config');

class WechatConfig {
  static validate() {
    const authValid = authConfig.validate();
    const payValid = payConfig.validate();
    
    if (!authValid.isValid || !payValid.isValid) {
      const errors = [];
      if (!authValid.isValid) {
        errors.push(`微信登录配置缺失: ${authValid.missing.join(', ')}`);
      }
      if (!payValid.isValid) {
        errors.push(`微信支付配置缺失: ${payValid.missing.join(', ')}`);
      }
      throw new Error(errors.join('; '));
    }
    
    return { isValid: true };
  }
  
  static getAuthConfig() {
    return authConfig.getConfig();
  }
  
  /**
   * 获取支付配置
   * @returns {Object} 支付配置
   * @returns {string} 支付配置.appId - 微信支付应用ID
   * @returns {string} 支付配置.mchId - 微信支付商户号
   * @returns {string} 支付配置.notifyUrl - 支付结果通知回调URL
   * @returns {string} 支付配置.tradeType - 交易类型，默认为'NATIVE'(扫码支付)
   * @returns {string} 支付配置.signType - 签名类型，默认为'MD5'
   */
  static getPayConfig() {
    return payConfig.getConfig();
  }
  
  static getAllConfig() {
    return {
      auth: this.getAuthConfig(),
      pay: this.getPayConfig()
    };
  }
}

module.exports = WechatConfig;
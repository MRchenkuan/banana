const payConfig = require('./pay.config');

class AlipayConfig {
  static validate() {
    const payValid = payConfig.validate();
    
    if (!payValid.isValid) {
      const errors = [];
      if (!payValid.isValid) {
        errors.push(`支付宝支付配置缺失: ${payValid.missing.join(', ')}`);
      }
      throw new Error(errors.join('; '));
    }
    
    return { isValid: true };
  }
  
  /**
   * 获取支付配置
   * @returns {Object} 支付配置
   * @returns {string} 支付配置.appId - 支付宝应用ID
   * @returns {string} 支付配置.privateKey - 支付宝应用私钥
   * @returns {string} 支付配置.publicKey - 支付宝公钥
   * @returns {string} 支付配置.notifyUrl - 支付结果通知回调URL
   * @returns {string} 支付配置.gatewayUrl - 支付宝网关URL
   */
  static getPayConfig() {
    return payConfig.getConfig();
  }
  
  static getAllConfig() {
    return {
      pay: this.getPayConfig()
    };
  }
}

module.exports = AlipayConfig;
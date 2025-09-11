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
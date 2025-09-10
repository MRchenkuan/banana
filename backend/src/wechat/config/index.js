const authConfig = require('./auth.config');
const payConfig = require('./pay.config');

class WechatConfig {
  static validate() {
    const authValid = authConfig.validate();
    const payValid = payConfig.validate();
    
    if (!authValid.isValid || !payValid.isValid) {
      throw new Error('微信配置验证失败');
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
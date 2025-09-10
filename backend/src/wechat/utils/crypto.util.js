const crypto = require('crypto');

class WechatCryptoUtil {
  /**
   * 生成MD5哈希
   */
  static md5(data) {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex').toUpperCase();
  }
  
  /**
   * 生成SHA1哈希
   */
  static sha1(data) {
    return crypto.createHash('sha1').update(data, 'utf8').digest('hex');
  }
  
  /**
   * 生成随机字符串
   */
  static generateNonceStr(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * 生成时间戳
   */
  static generateTimestamp() {
    return Math.floor(Date.now() / 1000);
  }
}

module.exports = WechatCryptoUtil;
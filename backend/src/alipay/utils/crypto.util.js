const crypto = require('crypto');

class AlipayCryptoUtil {
  /**
   * 生成MD5哈希
   */
  static md5(data) {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
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
  
  /**
   * RSA签名
   * @param {string} content - 待签名内容
   * @param {string} privateKey - 私钥
   * @returns {string} 签名结果
   */
  static rsaSign(content, privateKey) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(content, 'utf8');
    return sign.sign(privateKey, 'base64');
  }
  
  /**
   * RSA验签
   * @param {string} content - 待验证内容
   * @param {string} signature - 签名
   * @param {string} publicKey - 公钥
   * @returns {boolean} 验证结果
   */
  static rsaVerify(content, signature, publicKey) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(content, 'utf8');
    return verify.verify(publicKey, signature, 'base64');
  }
}

module.exports = AlipayCryptoUtil;
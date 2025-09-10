const crypto = require('crypto');

/**
 * 加密工具类
 * 提供各种加密和签名功能
 */
class CryptoUtils {
  /**
   * MD5 哈希
   */
  static md5(data) {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
  }

  /**
   * SHA1 哈希
   */
  static sha1(data) {
    return crypto.createHash('sha1').update(data, 'utf8').digest('hex');
  }

  /**
   * 微信 JS-SDK 签名
   */
  static generateJSSDKSignature(ticket, nonceStr, timestamp, url) {
    const string1 = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    return this.sha1(string1);
  }

  /**
   * 生成随机字符串
   */
  static generateRandomString(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = CryptoUtils;
const crypto = require('crypto');
const WechatUtils = require('./WechatUtils');

/**
 * 加密签名工具类
 * 提供各种签名算法的实现
 */
class CryptoUtils {
  /**
   * 生成微信支付MD5签名
   * @param {Object} params 参数对象
   * @param {string} apiKey API密钥
   * @returns {string} MD5签名
   */
  static generateWechatPaySign(params, apiKey) {
    // 排序参数并过滤空值
    const sortedParams = WechatUtils.sortParams(params);
    
    // 构建签名字符串
    const stringToSign = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&') + `&key=${apiKey}`;
    
    // 生成MD5签名
    return crypto.createHash('md5')
      .update(stringToSign, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 生成微信JS-SDK签名
   * @param {Object} params 参数对象 {jsapi_ticket, noncestr, timestamp, url}
   * @returns {string} SHA1签名
   */
  static generateJSSDKSign(params) {
    const { jsapi_ticket, noncestr, timestamp, url } = params;
    
    // 按字典序排列参数
    const stringToSign = `jsapi_ticket=${jsapi_ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    
    // 生成SHA1签名
    return crypto.createHash('sha1')
      .update(stringToSign, 'utf8')
      .digest('hex');
  }

  /**
   * 生成HMAC-SHA256签名
   * @param {string} data 待签名数据
   * @param {string} key 密钥
   * @returns {string} HMAC-SHA256签名
   */
  static generateHMACSign(data, key) {
    return crypto.createHmac('sha256', key)
      .update(data, 'utf8')
      .digest('hex');
  }

  /**
   * 验证微信支付签名
   * @param {Object} params 参数对象
   * @param {string} apiKey API密钥
   * @param {string} receivedSign 接收到的签名
   * @returns {boolean} 验证结果
   */
  static verifyWechatPaySign(params, apiKey, receivedSign) {
    const calculatedSign = this.generateWechatPaySign(params, apiKey);
    return calculatedSign === receivedSign;
  }

  /**
   * AES加密
   * @param {string} data 待加密数据
   * @param {string} key 密钥
   * @returns {string} 加密后的数据
   */
  static aesEncrypt(data, key) {
    const cipher = crypto.createCipher('aes192', key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * AES解密
   * @param {string} encryptedData 加密数据
   * @param {string} key 密钥
   * @returns {string} 解密后的数据
   */
  static aesDecrypt(encryptedData, key) {
    const decipher = crypto.createDecipher('aes192', key);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = CryptoUtils;
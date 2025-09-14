const AlipayCryptoUtil = require('./crypto.util');

class AlipaySignatureUtil {
  /**
   * 生成支付宝请求签名
   * @param {Object} params - 请求参数
   * @param {string} privateKey - 应用私钥
   * @returns {string} 签名
   */
  static generateSign(params, privateKey) {
    // 1. 过滤空值和签名参数
    const filteredParams = {};
    for (const key in params) {
      if (params[key] !== '' && params[key] !== undefined && params[key] !== null && key !== 'sign') {
        filteredParams[key] = params[key];
      }
    }
    
    // 2. 按照字典序排序
    const sortedKeys = Object.keys(filteredParams).sort();
    
    // 3. 拼接为key=value&key=value格式
    const stringToSign = sortedKeys.map(key => `${key}=${filteredParams[key]}`).join('&');
    
    // 4. 使用私钥签名
    return AlipayCryptoUtil.rsaSign(stringToSign, privateKey);
  }
  
  /**
   * 验证支付宝回调签名
   * @param {Object} params - 回调参数
   * @param {string} publicKey - 支付宝公钥
   * @returns {boolean} 验证结果
   */
  static verifySign(params, publicKey) {
    // 1. 获取签名
    const sign = params.sign;
    const signType = params.sign_type;
    
    // 2. 移除sign和sign_type参数
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;
    delete paramsWithoutSign.sign_type;
    
    // 3. 按照字典序排序并拼接为key=value&key=value格式
    const sortedKeys = Object.keys(paramsWithoutSign).sort();
    const stringToVerify = sortedKeys.map(key => `${key}=${paramsWithoutSign[key]}`).join('&');
    
    // 4. 使用支付宝公钥验证签名
    return AlipayCryptoUtil.rsaVerify(stringToVerify, sign, publicKey);
  }
}

module.exports = AlipaySignatureUtil;
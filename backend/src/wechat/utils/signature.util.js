const WechatCryptoUtil = require('./crypto.util');

class WechatSignatureUtil {
  /**
   * 生成微信支付签名
   */
  static generatePaySign(params, key) {
    const sortedKeys = Object.keys(params)
      .filter(k => params[k] !== '' && params[k] !== undefined && params[k] !== null && k !== 'sign')
      .sort();
    
    const stringA = sortedKeys
      .map(k => `${k}=${params[k]}`)
      .join('&');
    
    const stringSignTemp = `${stringA}&key=${key}`; // 添加key参数
    
    return WechatCryptoUtil.md5(stringSignTemp).toUpperCase(); // 转为大写
  }
  
  /**
   * 生成JS-SDK签名
   */
  static generateJSSDKSign(ticket, nonceStr, timestamp, url) {
    const string1 = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    return WechatCryptoUtil.sha1(string1);
  }
  
  /**
   * 验证微信回调签名
   */
  static verifySign(params) {
    const sign = params.sign;
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;
    
    const calculatedSign = this.generatePaySign(paramsWithoutSign);
    return sign === calculatedSign;
  }
}

module.exports = WechatSignatureUtil;
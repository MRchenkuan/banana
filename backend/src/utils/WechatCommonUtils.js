const crypto = require('crypto');
const xml2js = require('xml2js');

/**
 * 微信通用工具类
 * 包含微信登录和支付都会用到的公共方法
 */
class WechatCommonUtils {
  /**
   * 生成微信签名
   * @param {Object} params - 参数对象
   * @param {string} key - 签名密钥
   * @param {string} algorithm - 签名算法 (md5|sha1)
   * @param {boolean} includeKey - 是否在签名字符串中包含key参数
   */
  static generateSign(params, key, algorithm = 'md5', includeKey = true) {
    const sortedKeys = Object.keys(params)
      .filter(k => params[k] !== '' && k !== 'sign')
      .sort();
    
    const stringA = sortedKeys
      .map(k => `${k}=${params[k]}`)
      .join('&');
    
    const stringSignTemp = includeKey ? `${stringA}&key=${key}` : stringA;
    
    return crypto
      .createHash(algorithm)
      .update(stringSignTemp, 'utf8')
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 生成随机字符串
   * @param {number} length - 长度
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
   * 构建XML数据
   * @param {Object} params - 参数对象
   */
  static buildXmlData(params) {
    const xmlParts = ['<xml>'];
    Object.keys(params).forEach(key => {
      xmlParts.push(`<${key}><![CDATA[${params[key]}]]></${key}>`);
    });
    xmlParts.push('</xml>');
    return xmlParts.join('');
  }

  /**
   * 解析XML响应
   * @param {string} xmlData - XML字符串
   */
  static async parseXmlResponse(xmlData) {
    const parser = new xml2js.Parser({ explicitArray: false });
    try {
      const result = await parser.parseStringPromise(xmlData);
      return result;
    } catch (error) {
      throw new Error(`XML解析失败: ${error.message}`);
    }
  }

  /**
   * 验证微信回调签名
   * @param {Object} params - 回调参数
   * @param {string} key - 验证密钥
   * @param {string} algorithm - 签名算法
   */
  static verifySign(params, key, algorithm = 'md5') {
    const sign = params.sign;
    const paramsWithoutSign = { ...params };
    delete paramsWithoutSign.sign;
    
    const calculatedSign = this.generateSign(paramsWithoutSign, key, algorithm);
    return sign === calculatedSign;
  }

  /**
   * 格式化微信API错误
   * @param {Object} result - 微信API返回结果
   */
  static formatWechatError(result) {
    if (result.return_code !== 'SUCCESS') {
      return `微信API调用失败: ${result.return_msg}`;
    }
    if (result.result_code !== 'SUCCESS') {
      return `微信业务处理失败: ${result.err_code_des || result.err_code}`;
    }
    return null;
  }
}

module.exports = WechatCommonUtils;
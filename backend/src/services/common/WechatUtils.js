const crypto = require('crypto');

/**
 * 微信通用工具类
 * 提供微信支付和登录模块共用的基础功能
 */
class WechatUtils {
  /**
   * 生成随机字符串
   * @param {number} length 字符串长度，默认32位
   * @returns {string} 随机字符串
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
   * @returns {string} 当前时间戳（秒）
   */
  static generateTimestamp() {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * 参数排序
   * @param {Object} params 参数对象
   * @returns {Object} 排序后的参数对象
   */
  static sortParams(params) {
    return Object.keys(params)
      .sort()
      .reduce((result, key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          result[key] = params[key];
        }
        return result;
      }, {});
  }

  /**
   * 构建XML数据
   * @param {Object} params 参数对象
   * @returns {string} XML字符串
   */
  static buildXML(params) {
    let xml = '<xml>';
    Object.keys(params).forEach(key => {
      xml += `<${key}><![CDATA[${params[key]}]]></${key}>`;
    });
    xml += '</xml>';
    return xml;
  }

  /**
   * 解析XML响应
   * @param {string} xmlString XML字符串
   * @returns {Object} 解析后的对象
   */
  static parseXML(xmlString) {
    const result = {};
    const regex = /<(\w+)><!\[CDATA\[([^\]]+)\]\]><\/\1>/g;
    let match;
    
    while ((match = regex.exec(xmlString)) !== null) {
      result[match[1]] = match[2];
    }
    
    // 处理没有CDATA的标签
    const simpleRegex = /<(\w+)>([^<]+)<\/\1>/g;
    while ((match = simpleRegex.exec(xmlString)) !== null) {
      if (!result[match[1]]) {
        result[match[1]] = match[2];
      }
    }
    
    return result;
  }

  /**
   * 验证必需参数
   * @param {Object} params 参数对象
   * @param {Array} requiredFields 必需字段数组
   * @throws {Error} 缺少必需参数时抛出错误
   */
  static validateRequiredParams(params, requiredFields) {
    const missingFields = requiredFields.filter(field => 
      !params[field] || params[field] === ''
    );
    
    if (missingFields.length > 0) {
      throw new Error(`缺少必需参数: ${missingFields.join(', ')}`);
    }
  }

  /**
   * 格式化金额（元转分）
   * @param {number} amount 金额（元）
   * @returns {number} 金额（分）
   */
  static formatAmount(amount) {
    return Math.round(parseFloat(amount) * 100);
  }

  /**
   * 生成订单号
   * @param {string} prefix 前缀
   * @returns {string} 订单号
   */
  static generateOrderNo(prefix = 'WX') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

module.exports = WechatUtils;
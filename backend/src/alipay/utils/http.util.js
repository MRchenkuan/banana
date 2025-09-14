const axios = require('axios');
const querystring = require('querystring');

class AlipayHttpUtil {
  /**
   * 发送GET请求
   */
  static async get(url, params = {}, options = {}) {
    try {
      const response = await axios.get(url, {
        params,
        ...options
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('GET请求失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 发送POST请求
   */
  static async post(url, data = {}, options = {}) {
    try {
      const response = await axios.post(url, data, options);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('POST请求失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 构建支付宝请求URL
   * @param {string} gatewayUrl - 支付宝网关URL
   * @param {Object} params - 请求参数
   * @returns {string} 完整的请求URL
   */
  static buildRequestUrl(gatewayUrl, params) {
    return `${gatewayUrl}?${querystring.stringify(params)}`;
  }
}

module.exports = AlipayHttpUtil;
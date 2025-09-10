const axios = require('axios');
const https = require('https');

/**
 * HTTP请求工具类
 * 提供统一的HTTP请求处理
 */
class HttpUtils {
  /**
   * 创建axios实例
   * @param {Object} config 配置选项
   * @returns {Object} axios实例
   */
  static createInstance(config = {}) {
    const defaultConfig = {
      timeout: 30000,
      headers: {
        'User-Agent': 'Banana-AI-Wechat-Client/1.0.0'
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };
    
    return axios.create({ ...defaultConfig, ...config });
  }

  /**
   * 微信API请求
   * @param {string} url 请求URL
   * @param {string|Object} data 请求数据
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  static async wechatRequest(url, data, options = {}) {
    const config = {
      method: 'POST',
      url,
      data,
      headers: {
        'Content-Type': 'application/xml',
        ...options.headers
      },
      timeout: options.timeout || 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      })
    };

    try {
      const response = await axios(config);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('微信API请求失败:', error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0
      };
    }
  }

  /**
   * GET请求
   * @param {string} url 请求URL
   * @param {Object} params 查询参数
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  static async get(url, params = {}, options = {}) {
    try {
      const instance = this.createInstance(options);
      const response = await instance.get(url, { params });
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0
      };
    }
  }

  /**
   * POST请求
   * @param {string} url 请求URL
   * @param {Object} data 请求数据
   * @param {Object} options 请求选项
   * @returns {Promise} 请求结果
   */
  static async post(url, data, options = {}) {
    try {
      const instance = this.createInstance(options);
      const response = await instance.post(url, data);
      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 0
      };
    }
  }

  /**
   * 微信OAuth请求
   * @param {string} url 请求URL
   * @param {Object} params 请求参数
   * @returns {Promise} 请求结果
   */
  static async wechatOAuthRequest(url, params) {
    try {
      const response = await axios.get(url, { 
        params,
        timeout: 10000
      });
      
      if (response.data.errcode) {
        throw new Error(`微信API错误: ${response.data.errmsg}`);
      }
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 重试请求
   * @param {Function} requestFn 请求函数
   * @param {number} maxRetries 最大重试次数
   * @param {number} delay 重试延迟（毫秒）
   * @returns {Promise} 请求结果
   */
  static async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await requestFn();
        if (result.success) {
          return result;
        }
        
        if (i === maxRetries) {
          return result;
        }
      } catch (error) {
        if (i === maxRetries) {
          return {
            success: false,
            error: error.message
          };
        }
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

module.exports = HttpUtils;
const axios = require('axios');

/**
 * HTTP请求工具类
 * 封装常用的HTTP请求方法，包含重试、超时等功能
 */
class HttpUtils {
  /**
   * 微信API请求封装
   * @param {string} url - 请求URL
   * @param {Object|string} data - 请求数据
   * @param {Object} options - 请求选项
   */
  static async wechatRequest(url, data, options = {}) {
    const defaultOptions = {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/xml',
        'User-Agent': 'Banana-AI-Chat/1.0'
      },
      maxRetries: 2,
      retryDelay: 1000
    };

    const config = { ...defaultOptions, ...options };
    const { maxRetries, retryDelay, ...axiosConfig } = config;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(url, data, axiosConfig);
        return response.data;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`微信API请求失败 (${attempt + 1}/${maxRetries + 1}):`, {
            url,
            error: error.message,
            response: error.response?.data
          });
          throw new Error(`微信API请求失败: ${error.message}`);
        }
        
        console.warn(`微信API请求重试 (${attempt + 1}/${maxRetries + 1}):`, error.message);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  /**
   * 微信OAuth请求封装
   * @param {string} url - 请求URL
   * @param {Object} params - 请求参数
   * @param {Object} options - 请求选项
   */
  static async wechatOAuthRequest(url, params, options = {}) {
    const defaultOptions = {
      timeout: 8000,
      headers: {
        'User-Agent': 'Banana-AI-Chat/1.0'
      }
    };

    try {
      const response = await axios.get(url, {
        params,
        ...defaultOptions,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('微信OAuth请求失败:', {
        url,
        params,
        error: error.message
      });
      throw new Error(`微信OAuth请求失败: ${error.message}`);
    }
  }
}

module.exports = HttpUtils;
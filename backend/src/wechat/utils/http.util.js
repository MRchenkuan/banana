const axios = require('axios');
const e = require('express');
const xml2js = require('xml2js');

class WechatHttpUtil {
  /**
   * GET请求
   */
  static async get(url, params, options = {}) {
    try {
      const response = await axios.get(url, {
        params,
        timeout: 10000,
        ...options
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('HTTP GET请求失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * POST请求
   */
  static async post(url, data, options = {}) {
    try {
      const response = await axios.post(url, data, {
        timeout: 10000,
        ...options
      });
      
      // 如果是XML响应，解析为对象
      let responseData = response.data;
      if (typeof responseData === 'string' && responseData.includes('<xml>')) {
        responseData = await this.parseXml(responseData);
      }
      // 不能直接判断 success true ,有可能 responseData 没成功
      if (responseData.errcode == 0) {
        return {
          success: true,
          data: responseData,
          errcode: responseData.errcode,
          errmsg: responseData.errmsg
        };
      } else {
        return {
          success: false,
          data: responseData,
          errcode: responseData.errcode,
          errmsg: responseData.errmsg
        };
      }
    } catch (error) {
      console.error('HTTP POST请求失败:', error.message);
      return {
        success: false,
        data: error,
        errcode: error.code,
        errmsg: error.message
      };
    }
  }
  
  /**
   * 解析XML
   */
  static async parseXml(xmlString) {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlString);
      return result.xml;
    } catch (error) {
      console.error('XML解析失败:', error);
      throw error;
    }
  }
}

module.exports = WechatHttpUtil;
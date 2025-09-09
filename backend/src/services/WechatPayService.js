const crypto = require('crypto');
const axios = require('axios');
const xml2js = require('xml2js');

class WechatPayService {
  constructor() {
    this.config = {
      appId: process.env.WECHAT_APP_ID,
      mchId: process.env.WECHAT_MCH_ID,
      apiKey: process.env.WECHAT_API_KEY,
      notifyUrl: process.env.WECHAT_NOTIFY_URL || 'http://localhost:3001/api/orders/wechat/notify',
      apiUrl: 'https://api.mch.weixin.qq.com'
    };
  }

  // 生成微信支付签名
  generateSign(params, apiKey = this.config.apiKey) {
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .filter(key => params[key] !== '' && key !== 'sign')
      .map(key => `${key}=${params[key]}`)
      .join('&');
    const stringSignTemp = `${stringA}&key=${apiKey}`;
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  // 生成随机字符串
  generateNonceStr(length = 32) {
    return crypto.randomBytes(length / 2).toString('hex');
  }

  // 构建XML请求体
  buildXmlData(params) {
    const xmlBuilder = new xml2js.Builder({
      rootName: 'xml',
      cdata: true,
      headless: true
    });
    return xmlBuilder.buildObject(params);
  }

  // 解析XML响应
  async parseXmlResponse(xmlData) {
    const parser = new xml2js.Parser({ explicitArray: false });
    return await parser.parseStringPromise(xmlData);
  }

  // 统一下单
  async createUnifiedOrder(orderData) {
    const {
      orderNo,
      amount,
      description,
      clientIp,
      tradeType = 'NATIVE'
    } = orderData;

    const params = {
      appid: this.config.appId,
      mch_id: this.config.mchId,
      nonce_str: this.generateNonceStr(),
      body: description,
      out_trade_no: orderNo,
      total_fee: Math.round(amount * 100), // 转换为分
      spbill_create_ip: clientIp || '127.0.0.1',
      notify_url: this.config.notifyUrl,
      trade_type: tradeType
    };

    // 生成签名
    params.sign = this.generateSign(params);

    try {
      const xmlData = this.buildXmlData(params);
      const response = await axios.post(
        `${this.config.apiUrl}/pay/unifiedorder`,
        xmlData,
        {
          headers: { 'Content-Type': 'application/xml' },
          timeout: 10000
        }
      );

      const result = await this.parseXmlResponse(response.data);
      
      if (result.xml.return_code === 'SUCCESS' && result.xml.result_code === 'SUCCESS') {
        return {
          success: true,
          prepayId: result.xml.prepay_id,
          codeUrl: result.xml.code_url,
          data: result.xml
        };
      } else {
        return {
          success: false,
          error: result.xml.return_msg || result.xml.err_code_des,
          data: result.xml
        };
      }
    } catch (error) {
      console.error('微信支付统一下单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 查询订单
  async queryOrder(orderNo) {
    const params = {
      appid: this.config.appId,
      mch_id: this.config.mchId,
      out_trade_no: orderNo,
      nonce_str: this.generateNonceStr()
    };

    params.sign = this.generateSign(params);

    try {
      const xmlData = this.buildXmlData(params);
      const response = await axios.post(
        `${this.config.apiUrl}/pay/orderquery`,
        xmlData,
        {
          headers: { 'Content-Type': 'application/xml' },
          timeout: 10000
        }
      );

      const result = await this.parseXmlResponse(response.data);
      
      if (result.xml.return_code === 'SUCCESS' && result.xml.result_code === 'SUCCESS') {
        return {
          success: true,
          tradeState: result.xml.trade_state,
          transactionId: result.xml.transaction_id,
          data: result.xml
        };
      } else {
        return {
          success: false,
          error: result.xml.return_msg || result.xml.err_code_des,
          data: result.xml
        };
      }
    } catch (error) {
      console.error('微信支付查询订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 验证回调签名
  verifyNotifySign(params) {
    const sign = params.sign;
    delete params.sign;
    const calculatedSign = this.generateSign(params);
    return sign === calculatedSign;
  }

  // 关闭订单
  async closeOrder(orderNo) {
    const params = {
      appid: this.config.appId,
      mch_id: this.config.mchId,
      out_trade_no: orderNo,
      nonce_str: this.generateNonceStr()
    };

    params.sign = this.generateSign(params);

    try {
      const xmlData = this.buildXmlData(params);
      const response = await axios.post(
        `${this.config.apiUrl}/pay/closeorder`,
        xmlData,
        {
          headers: { 'Content-Type': 'application/xml' },
          timeout: 10000
        }
      );

      const result = await this.parseXmlResponse(response.data);
      
      return {
        success: result.xml.return_code === 'SUCCESS' && result.xml.result_code === 'SUCCESS',
        data: result.xml
      };
    } catch (error) {
      console.error('微信支付关闭订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WechatPayService;
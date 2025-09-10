const WechatCommonUtils = require('../utils/WechatCommonUtils');
const HttpUtils = require('../utils/HttpUtils');
const { PaymentRecord, User } = require('../utils/database');

/**
 * 微信支付服务
 * 整合所有微信支付相关功能：统一下单、查询订单、回调处理等
 */
class WechatPayService {
  constructor() {
    this.config = {
      appId: process.env.WECHAT_PAY_APP_ID,
      mchId: process.env.WECHAT_PAY_MCH_ID,
      apiKey: process.env.WECHAT_PAY_API_KEY,
      notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL || 'http://localhost:3001/api/payment/notify',
      apiUrl: 'https://api.mch.weixin.qq.com'
    };
  }

  /**
   * 统一下单
   * @param {Object} orderData - 订单数据
   */
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
      nonce_str: WechatCommonUtils.generateNonceStr(),
      body: description,
      out_trade_no: orderNo,
      total_fee: Math.round(amount * 100), // 转换为分
      spbill_create_ip: clientIp || '127.0.0.1',
      notify_url: this.config.notifyUrl,
      trade_type: tradeType
    };

    // 生成签名
    params.sign = WechatCommonUtils.generateSign(params, this.config.apiKey);

    try {
      const xmlData = WechatCommonUtils.buildXmlData(params);
      const responseData = await HttpUtils.wechatRequest(
        `${this.config.apiUrl}/pay/unifiedorder`,
        xmlData
      );

      const result = await WechatCommonUtils.parseXmlResponse(responseData);
      const error = WechatCommonUtils.formatWechatError(result.xml);
      
      if (error) {
        return { success: false, error };
      }

      return {
        success: true,
        prepayId: result.xml.prepay_id,
        codeUrl: result.xml.code_url,
        data: result.xml
      };
    } catch (error) {
      console.error('微信支付统一下单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查询订单
   * @param {string} orderNo - 订单号
   */
  async queryOrder(orderNo) {
    const params = {
      appid: this.config.appId,
      mch_id: this.config.mchId,
      out_trade_no: orderNo,
      nonce_str: WechatCommonUtils.generateNonceStr()
    };

    params.sign = WechatCommonUtils.generateSign(params, this.config.apiKey);

    try {
      const xmlData = WechatCommonUtils.buildXmlData(params);
      const responseData = await HttpUtils.wechatRequest(
        `${this.config.apiUrl}/pay/orderquery`,
        xmlData
      );

      const result = await WechatCommonUtils.parseXmlResponse(responseData);
      const error = WechatCommonUtils.formatWechatError(result.xml);
      
      if (error) {
        return { success: false, error };
      }

      return {
        success: true,
        tradeState: result.xml.trade_state,
        transactionId: result.xml.transaction_id,
        data: result.xml
      };
    } catch (error) {
      console.error('微信支付查询订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 处理支付回调
   * @param {Object} callbackData - 回调数据
   */
  async handlePaymentCallback(callbackData) {
    try {
      const result = await WechatCommonUtils.parseXmlResponse(callbackData);
      const params = result.xml;
      
      // 验证签名
      if (!WechatCommonUtils.verifySign(params, this.config.apiKey)) {
        throw new Error('签名验证失败');
      }
      
      const error = WechatCommonUtils.formatWechatError(params);
      if (error) {
        throw new Error(error);
      }
      
      // 处理支付成功逻辑
      await this.processPaymentSuccess(params);
      
      return {
        success: true,
        response: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
      };
    } catch (error) {
      console.error('微信支付回调处理失败:', error);
      return {
        success: false,
        response: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>'
      };
    }
  }

  /**
   * 处理支付成功逻辑
   * @param {Object} paymentData - 支付数据
   */
  async processPaymentSuccess(paymentData) {
    const orderId = paymentData.out_trade_no;
    const transactionId = paymentData.transaction_id;
    
    // 查找订单
    const order = await PaymentRecord.findOne({
      where: { orderId: orderId, status: 'pending' }
    });
    
    if (!order) {
      throw new Error('订单不存在或已处理');
    }
    
    // 更新订单状态
    await order.update({
      status: 'completed',
      transactionId: transactionId,
      completedAt: new Date()
    });
    
    // 增加用户token余额
    await User.increment(
      'tokenBalance',
      {
        by: order.tokensPurchased,
        where: { id: order.userId }
      }
    );
    
    console.log(`支付成功处理完成: 订单${orderId}, 用户${order.userId}, 充值${order.tokensPurchased}tokens`);
  }

  /**
   * 关闭订单
   * @param {string} orderNo - 订单号
   */
  async closeOrder(orderNo) {
    const params = {
      appid: this.config.appId,
      mch_id: this.config.mchId,
      out_trade_no: orderNo,
      nonce_str: WechatCommonUtils.generateNonceStr()
    };

    params.sign = WechatCommonUtils.generateSign(params, this.config.apiKey);

    try {
      const xmlData = WechatCommonUtils.buildXmlData(params);
      const responseData = await HttpUtils.wechatRequest(
        `${this.config.apiUrl}/pay/closeorder`,
        xmlData
      );

      const result = await WechatCommonUtils.parseXmlResponse(responseData);
      const error = WechatCommonUtils.formatWechatError(result.xml);
      
      return {
        success: !error,
        error: error,
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
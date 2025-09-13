const WechatConfig = require('../config');
const WechatHttpUtil = require('../utils/http.util');
const WechatCryptoUtil = require('../utils/crypto.util');
const WechatSignatureUtil = require('../utils/signature.util');
const { Order, User } = require('../../models'); // 修改这里，使用 Order 替代 PaymentRecord
const TokenRechargeService = require('../../services/bill/TokenRechargeService');

class WechatPayService {
  constructor() {
    /**
     * 支付配置
     * @type {Object}
     * @property {string} appId - 微信支付应用ID
     * @property {string} mchId - 微信支付商户号
     * @property {string} apiKey - 微信支付API密钥
     * @property {string} notifyUrl - 支付结果通知回调URL
     * @property {string} tradeType - 交易类型，默认为'NATIVE'(扫码支付)
     * @property {string} signType - 签名类型，默认为'MD5'
     */
    this.config = WechatConfig.getPayConfig();
  }
  
  /**
   * 创建统一下单
   * @param {Object} params - 统一下单参数
   * @param {string} params.orderNo - 订单号
   * @param {number} params.amount - 订单金额，单位为元
   * @param {string} params.description - 订单描述
   * @param {string} params.clientIp - 客户端IP地址
   * @returns {Promise<Object>} 统一下单结果
   * @returns {boolean} 统一下单结果.success - 是否成功
   * @returns {string} 统一下单结果.prepayId - 预支付交易会话标识
   * @returns {string} 统一下单结果.codeUrl - 二维码链接，tradeType为NATIVE时返回
   * @returns {string} 统一下单结果.tradeType - 交易类型，默认为'NATIVE'(扫码支付)
   * @returns {string} 统一下单结果.signType - 签名类型，默认为'MD5'
   */
  async createUnifiedOrder({ orderNo, amount, description, clientIp }) {
    try {
      const params = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: WechatCryptoUtil.generateNonceStr(),
        sign_type: this.config.signType,
        body: description,
        out_trade_no: orderNo,
        total_fee: Math.round(amount * 100), // 转换为分
        spbill_create_ip: clientIp,
        notify_url: this.config.notifyUrl,
        trade_type: this.config.tradeType,
        fee_type: 'CNY', // 添加币种类型
      };
      
      // 生成签名
      params.sign = WechatSignatureUtil.generatePaySign(params, this.config.apiKey);
      
      // 转换为XML
      const xmlData = this.objectToXml(params);
      
      // 发送请求
      const result = await WechatHttpUtil.post(
        'https://api.mch.weixin.qq.com/pay/unifiedorder',
        xmlData,
        { headers: { 'Content-Type': 'application/xml' } }
      );
      
      if (result.success && result.data.return_code === 'SUCCESS' && result.data.result_code === 'SUCCESS') {
        return {
          success: true,
          prepayId: result.data.prepay_id,
          codeUrl: result.data.code_url,
          tradeType: result.data.trade_type,
          signType: this.config.signType
        };
      }
      
      return {
        success: false,
        error: result.data.return_msg || result.data.err_code_des || '创建订单失败'
      };
    } catch (error) {
      console.error('创建统一下单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 格式化日期为yyyyMMddHHmmss
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }
  
  /**
   * 处理支付回调
   */
  async handlePaymentCallback(xmlData) {
    try {
      const data = this.xmlToObject(xmlData);
      
      // 验证签名
      const isValidSign = WechatSignatureUtil.verifySign(data);
      if (!isValidSign) {
        throw new Error('签名验证失败');
      }
      
      if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
        // 使用共享逻辑更新订单状态
        await this.updateOrderStatus(data.out_trade_no, data.transaction_id);
      }
      
      return {
        response: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>'
      };
    } catch (error) {
      console.error('处理支付回调失败:', error);
      return {
        response: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>'
      };
    }
  }
  
  /**
   * 查询订单状态
   * @param {string} orderNo - 订单号
   * @param {boolean} autoUpdate - 是否自动更新订单状态
   */
  async queryOrder(orderNo, autoUpdate = false) {
    try {
      const params = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: orderNo,
        nonce_str: WechatCryptoUtil.generateNonceStr()
      };
      
      params.sign = WechatSignatureUtil.generatePaySign(params);
      const xmlData = this.objectToXml(params);
      
      const result = await WechatHttpUtil.post(
        'https://api.mch.weixin.qq.com/pay/orderquery',
        xmlData,
        { headers: { 'Content-Type': 'application/xml' } }
      );
      
      if (result.success && result.data.return_code === 'SUCCESS') {
        // 如果支付成功且需要自动更新订单状态
        if (autoUpdate && result.data.trade_state === 'SUCCESS') {
          await this.updateOrderStatus(orderNo, result.data.transaction_id);
        }
        
        return {
          success: true,
          tradeState: result.data.trade_state,
          transactionId: result.data.transaction_id
        };
      }
      
      return {
        success: false,
        error: result.data.return_msg || '查询订单失败'
      };
    } catch (error) {
      console.error('查询订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 对象转XML
   */
  objectToXml(obj) {
    let xml = '<xml>';
    for (const key in obj) {
      if (obj[key] !== undefined && obj[key] !== null) {
        xml += `<${key}><![CDATA[${obj[key]}]]></${key}>`;
      }
    }
    xml += '</xml>';
    return xml;
  }
  
  /**
   * XML转对象
   */
  xmlToObject(xml) {
    const obj = {};
    const regex = /<(\w+)><!\[CDATA\[([^\]]+)\]\]><\/\1>/g;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      obj[match[1]] = match[2];
    }
    
    return obj;
  }
  
  /**
   * 更新订单状态（共享逻辑）
   * 用于处理微信支付回调和用户主动查询
   * @param {string} orderId - 订单号
   * @param {string} transactionId - 微信支付交易号
   * @returns {Promise<Object>} 更新结果
   */
  async updateOrderStatus(orderId, transactionId) {
    try {
      // 查询本地订单
      const order = await Order.findOne({
        where: { orderNo: orderId }
      });
      
      if (!order) {
        return {
          success: false,
          error: '订单不存在'
        };
      }
      
      // 如果订单已经完成，直接返回成功（幂等性处理）
      if (order.status === 'paid' || order.status === 'completed') {
        return {
          success: true,
          message: '订单已处理',
          status: order.status,
          tokensAdded: order.tokensPurchased,
          alreadyProcessed: true
        };
      }
      
      // 更新订单状态
      await order.markAsPaid(transactionId);
      
      // 使用TokenRechargeService记录充值并更新余额
      const rechargeResult = await TokenRechargeService.addTokensFromPayment(order);
      
      return {
        success: true,
        message: '订单状态更新成功',
        status: 'paid',
        tokensAdded: order.tokensPurchased,
        alreadyProcessed: false,
        rechargeId: rechargeResult.rechargeId
      };
    } catch (error) {
      console.error('更新订单状态失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = WechatPayService;
const WechatConfig = require('../config');
const WechatHttpUtil = require('../utils/http.util');
const WechatCryptoUtil = require('../utils/crypto.util');
const WechatSignatureUtil = require('../utils/signature.util');
const { PaymentRecord, User } = require('../../utils/database');
const { v4: uuidv4 } = require('uuid');

class WechatPayService {
  constructor() {
    this.config = WechatConfig.getPayConfig();
  }
  
  /**
   * 创建统一下单
   */
  async createUnifiedOrder({ orderNo, amount, description, clientIp }) {
    try {
      const params = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        nonce_str: WechatCryptoUtil.generateNonceStr(),
        body: description,
        out_trade_no: orderNo,
        total_fee: Math.round(amount * 100), // 转换为分
        spbill_create_ip: clientIp,
        notify_url: this.config.notifyUrl,
        trade_type: this.config.tradeType
      };
      
      // 生成签名
      params.sign = WechatSignatureUtil.generatePaymentSign(params, this.config.apiKey);
      
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
          codeUrl: result.data.code_url
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
   * 处理支付回调
   */
  async handlePaymentCallback(xmlData) {
    try {
      const data = this.xmlToObject(xmlData);
      
      // 验证签名
      const isValidSign = WechatSignatureUtil.verifyPaymentSign(data, this.config.apiKey);
      if (!isValidSign) {
        throw new Error('签名验证失败');
      }
      
      if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
        // 更新订单状态
        const order = await PaymentRecord.findOne({
          where: { orderId: data.out_trade_no }
        });
        
        if (order && order.status === 'pending') {
          await order.update({
            status: 'completed',
            transactionId: data.transaction_id
          });
          
          // 更新用户token余额
          await User.increment('tokenBalance', {
            by: order.tokensPurchased,
            where: { id: order.userId }
          });
        }
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
   */
  async queryOrder(orderNo) {
    try {
      const params = {
        appid: this.config.appId,
        mch_id: this.config.mchId,
        out_trade_no: orderNo,
        nonce_str: WechatCryptoUtil.generateNonceStr()
      };
      
      params.sign = WechatSignatureUtil.generatePaymentSign(params, this.config.apiKey);
      const xmlData = this.objectToXml(params);
      
      const result = await WechatHttpUtil.post(
        'https://api.mch.weixin.qq.com/pay/orderquery',
        xmlData,
        { headers: { 'Content-Type': 'application/xml' } }
      );
      
      if (result.success && result.data.return_code === 'SUCCESS') {
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
}

module.exports = WechatPayService;
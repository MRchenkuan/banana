const AlipayConfig = require('../config');
const AlipayHttpUtil = require('../utils/http.util');
const AlipayCryptoUtil = require('../utils/crypto.util');
const AlipaySignatureUtil = require('../utils/signature.util');
const { Order } = require('../../models');
const TokenRechargeService = require('../../services/bill/TokenRechargeService');
const moment = require('moment');

class AlipayService {
  constructor() {
    /**
     * 支付配置
     * @type {Object}
     * @property {string} appId - 支付宝应用ID
     * @property {string} privateKey - 支付宝应用私钥
     * @property {string} publicKey - 支付宝公钥
     * @property {string} notifyUrl - 支付结果通知回调URL
     * @property {string} returnUrl - 支付完成后跳转URL
     * @property {string} gatewayUrl - 支付宝网关URL
     */
    this.config = AlipayConfig.getPayConfig();
    
    // 沙箱环境使用沙箱网关
    if (this.config.sandbox) {
      this.config.gatewayUrl = 'https://openapi.alipaydev.com/gateway.do';
    }
  }
  
  /**
   * 创建支付宝扫码支付订单
   * @param {Object} params - 统一下单参数
   * @param {string} params.orderNo - 订单号
   * @param {number} params.amount - 订单金额，单位为元
   * @param {string} params.description - 订单描述
   * @returns {Promise<Object>} 统一下单结果
   * @returns {boolean} 统一下单结果.success - 是否成功
   * @returns {string} 统一下单结果.qrCodeUrl - 二维码链接
   */
  async createUnifiedOrder({ orderNo, amount, description }) {
    try {
      // 构建请求参数
      const bizContent = {
        out_trade_no: orderNo,
        total_amount: amount.toFixed(2),
        subject: description,
        product_code: 'FACE_TO_FACE_PAYMENT', // 面对面付款，即扫码支付
      };
      
      const params = {
        app_id: this.config.appId,
        method: 'alipay.trade.precreate',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        version: '1.0',
        notify_url: this.config.notifyUrl,
        biz_content: JSON.stringify(bizContent)
      };
      
      // 生成签名
      params.sign = AlipaySignatureUtil.generateSign(params, this.config.privateKey);
      
      // 发送请求
      const result = await AlipayHttpUtil.post(
        this.config.gatewayUrl,
        null,
        {
          params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      if (result.success && result.data.alipay_trade_precreate_response) {
        const response = result.data.alipay_trade_precreate_response;
        
        if (response.code === '10000') {
          return {
            success: true,
            qrCodeUrl: response.qr_code
          };
        } else {
          return {
            success: false,
            error: response.sub_msg || response.msg || '创建订单失败'
          };
        }
      }
      
      return {
        success: false,
        error: '创建订单失败'
      };
    } catch (error) {
      console.error('创建支付宝扫码支付订单失败:', error);
      return {
        success: false,
        error: error.message
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
      // 构建请求参数
      const bizContent = {
        out_trade_no: orderNo
      };
      
      const params = {
        app_id: this.config.appId,
        method: 'alipay.trade.query',
        format: 'JSON',
        charset: 'utf-8',
        sign_type: 'RSA2',
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        version: '1.0',
        biz_content: JSON.stringify(bizContent)
      };
      
      // 生成签名
      params.sign = AlipaySignatureUtil.generateSign(params, this.config.privateKey);
      
      // 发送请求
      const result = await AlipayHttpUtil.post(
        this.config.gatewayUrl,
        null,
        {
          params,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      if (result.success && result.data.alipay_trade_query_response) {
        const response = result.data.alipay_trade_query_response;
        
        if (response.code === '10000') {
          // 如果支付成功且需要自动更新订单状态
          if (autoUpdate && response.trade_status === 'TRADE_SUCCESS') {
            await this.updateOrderStatus(orderNo, response.trade_no);
          }
          
          return {
            success: true,
            tradeState: response.trade_status,
            transactionId: response.trade_no
          };
        } else {
          return {
            success: false,
            error: response.sub_msg || response.msg || '查询订单失败'
          };
        }
      }
      
      return {
        success: false,
        error: '查询订单失败'
      };
    } catch (error) {
      console.error('查询支付宝订单失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * 验证支付宝回调签名
   */
  verifyNotifySign(notifyData) {
    return AlipaySignatureUtil.verifySign(notifyData, this.config.publicKey);
  }
  
  /**
   * 处理支付回调
   */
  async handlePaymentCallback(notifyData) {
    try {
      // 验证签名
      const isValidSign = this.verifyNotifySign(notifyData);
      if (!isValidSign) {
        throw new Error('签名验证失败');
      }
      
      if (notifyData.trade_status === 'TRADE_SUCCESS') {
        // 使用共享逻辑更新订单状态
        await this.updateOrderStatus(notifyData.out_trade_no, notifyData.trade_no);
      }
      
      return { success: true };
    } catch (error) {
      console.error('处理支付宝回调失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 更新订单状态（共享逻辑）
   * 用于处理支付宝回调和用户主动查询
   * @param {string} orderId - 订单号
   * @param {string} transactionId - 支付宝交易号
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

module.exports = AlipayService;
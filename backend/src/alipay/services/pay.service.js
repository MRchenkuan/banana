const { AlipaySdk } = require('alipay-sdk');
const { Order } = require('../../models');
const TokenRechargeService = require('../../services/bill/TokenRechargeService');

class AlipayService {
  constructor() {
    // 初始化支付宝SDK
    this.config = require('../config').getPayConfig();
    
    // 创建AlipaySdk实例
    this.alipaySdk = new AlipaySdk({
      appId: this.config.appId,
      privateKey: this.config.privateKey,
      alipayPublicKey: this.config.publicKey,
      // gateway: this.config.gatewayUrl,
      // signType: 'RSA2',
      // appAuthToken: this.config.appAuthToken,
    });
  }
  
  /**
   * 创建支付宝扫码支付订单
   * @param {Object} params - 统一下单参数
   * @param {string} params.orderNo - 订单号
   * @param {number|string} params.amount - 订单金额，单位为元
   * @param {string} params.description - 订单描述
   * @returns {Promise<Object>} 统一下单结果
   */
  async createUnifiedOrder({ orderNo, amount, description }) {
    try {
      // 确保amount是字符串格式
      const totalAmount = typeof amount === 'string' ? amount : amount.toFixed(2);
      const result = await this.alipaySdk.pageExec("alipay.trade.page.pay",{
        bizContent: {
          notify_url: this.config.notifyUrl,
          out_trade_no: orderNo,
          total_amount: totalAmount,
          subject: description,
          product_code: 'FAST_INSTANT_TRADE_PAY',
          qr_pay_mode: '4',
          qrcode_width: 200
        },
      })
      
      // 支付宝pageExec返回的是表单，不是二维码URL
      return {
        success: true,
        formHtml: result // 直接返回表单HTML
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
   * 验证支付宝回调签名
   * @param {Object} notifyData - 回调数据
   * @returns {boolean} 验证结果
   */
  verifyNotifySign(notifyData) {
    return this.alipaySdk.checkNotifySign(notifyData);
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
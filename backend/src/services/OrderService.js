const Order = require('../models/Order');
const { User } = require('../models');
const WechatPayService = require('../wechat/services/pay.service');
const TokenRechargeService = require('./bill/TokenRechargeService');
const PACKAGE_CONFIG = require('../config/packageConfig');

class OrderService {
  constructor() {
    this.wechatPay = new WechatPayService();
    this.packageConfig = {};
    PACKAGE_CONFIG.packages.forEach(pkg => {
      this.packageConfig[pkg.id] = {
        name: pkg.name,
        tokens: pkg.tokens,
        amount: pkg.amount
      };
    });
  }

  // 生成订单号
  generateOrderNo() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `BN${timestamp}${random}`.toUpperCase();
  }

  // 创建订单
  async createOrder(userId, packageId, clientIp, userAgent) {
    try {
      const packageInfo = this.packageConfig[packageId];
      if (!packageInfo) {
        throw new Error('无效的套餐类型');
      }

      const orderNo = this.generateOrderNo();
      const expiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30分钟后过期

      // 先调用微信支付统一下单
      const paymentResult = await this.wechatPay.createUnifiedOrder({
        orderNo,
        amount: packageInfo.amount,
        description: `Banana AI - ${packageInfo.name}`,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || '创建微信支付订单失败');
      }
      
      // 微信下单成功后，创建本地订单记录
      const order = await Order.create({
        userId,
        orderNo,
        packageId,
        packageName: packageInfo.name,
        amount: packageInfo.amount,
        tokensPurchased: packageInfo.tokens,
        status: 'pending',
        paymentMethod: 'wechat',
        paymentChannel: 'native',
        clientIp,
        userAgent,
        expiredAt,
        prepayId: paymentResult.prepayId,
        qrCodeUrl: paymentResult.codeUrl
      });

      return {
        success: true,
        order: {
          id: order.id,
          orderNo: order.orderNo,
          amount: order.amount,
          tokensPurchased: order.tokensPurchased,
          qrCodeUrl: order.qrCodeUrl,
          expiredAt: order.expiredAt
        }
      };
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }

  // 查询订单状态
  async queryOrderStatus(orderNo, userId = null) {
    try {
      const whereCondition = { orderNo };
      if (userId) {
        whereCondition.userId = userId;
      }

      const order = await Order.findOne({ where: whereCondition });
      if (!order) {
        throw new Error('订单不存在');
      }

      // 如果订单状态为pending，查询微信支付状态
      if (order.status === 'pending' && !order.isExpired()) {
        const paymentResult = await this.wechatPay.queryOrder(orderNo);
        
        if (paymentResult.success) {
          if (paymentResult.tradeState === 'SUCCESS') {
            // 支付成功，更新订单状态并增加用户Token
            await this.handlePaymentSuccess(order, paymentResult.transactionId);
          } else if (paymentResult.tradeState === 'CLOSED' || paymentResult.tradeState === 'PAYERROR') {
            // 支付失败
            await order.update({ status: 'failed' });
          }
        }
      } else if (order.status === 'pending' && order.isExpired()) {
        // 订单已过期
        await order.update({ status: 'expired' });
      }

      return {
        success: true,
        order: {
          id: order.id,
          orderNo: order.orderNo,
          status: order.status,
          amount: order.amount,
          tokensPurchased: order.tokensPurchased,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          expiredAt: order.expiredAt,
          qrCodeUrl: order.qrCodeUrl
        }
      };
    } catch (error) {
      console.error('查询订单状态失败:', error);
      throw error;
    }
  }

  // 处理支付成功
  async handlePaymentSuccess(order, transactionId) {
    try {
      // 如果订单已经完成，直接返回成功（幂等性处理）
      if (order.status === 'paid') {
        return { 
          success: true,
          alreadyProcessed: true
        };
      }
      
      // 更新订单状态
      await order.markAsPaid(transactionId);

      // 使用TokenRechargeService记录充值并更新余额
      const rechargeResult = await TokenRechargeService.addTokensFromPayment({
        userId: order.userId,
        orderId: order.orderNo,
        tokensPurchased: order.tokensPurchased
      });

      return { 
        success: true,
        alreadyProcessed: false,
        rechargeId: rechargeResult.rechargeId
      };
    } catch (error) {
      console.error('处理支付成功失败:', error);
      throw error;
    }
  }

  // 取消订单
  async cancelOrder(orderNo, userId, reason = '用户取消') {
    try {
      const order = await Order.findOne({
        where: { orderNo, userId, status: 'pending' }
      });

      if (!order) {
        throw new Error('订单不存在或无法取消');
      }

      // 关闭微信支付订单
      await this.wechatPay.closeOrder(orderNo);

      // 更新订单状态
      await order.cancel(reason);

      return { success: true };
    } catch (error) {
      console.error('取消订单失败:', error);
      throw error;
    }
  }

  // 获取用户订单列表
  async getUserOrders(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      
      const { count, rows } = await Order.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return {
        success: true,
        orders: rows.map(order => ({
          id: order.id,
          orderNo: order.orderNo,
          packageName: order.packageName,
          amount: order.amount,
          tokensPurchased: order.tokensPurchased,
          status: order.status,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          qrCodeUrl: order.qrCodeUrl
        })),
        pagination: {
          total: count,
          page,
          limit,
          pages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('获取用户订单列表失败:', error);
      throw error;
    }
  }

  // 处理微信支付回调
  async handleWechatNotify(notifyData) {
    try {
      // 验证签名
      if (!this.wechatPay.verifyNotifySign(notifyData)) {
        throw new Error('签名验证失败');
      }

      const { out_trade_no: orderNo, transaction_id: transactionId, result_code } = notifyData;
      
      const order = await Order.findOne({ where: { orderNo } });
      if (!order) {
        throw new Error('订单不存在');
      }

      if (result_code === 'SUCCESS') {
        // 支付成功
        if (order.status === 'pending') {
          await this.handlePaymentSuccess(order, transactionId);
        }
      } else {
        // 支付失败
        await order.update({ status: 'failed' });
      }

      return { success: true };
    } catch (error) {
      console.error('处理微信支付回调失败:', error);
      throw error;
    }
  }
  
  // 模拟支付成功（仅开发环境）
  async simulateSuccess(orderNo, userId) {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('此功能仅在开发环境可用');
    }

    try {
      const order = await Order.findOne({
        where: { orderNo, userId, status: 'pending' }
      });

      if (!order) {
        throw new Error('订单不存在或已处理');
      }

      // 处理支付成功
      await this.handlePaymentSuccess(order, `mock_${Date.now()}`);

      return {
        success: true,
        message: '模拟支付成功',
        tokensAdded: order.tokensPurchased
      };
    } catch (error) {
      console.error('模拟支付错误:', error);
      throw error;
    }
  }
}

module.exports = OrderService;
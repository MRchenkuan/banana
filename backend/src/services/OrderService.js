const Order = require('../models/Order');
const { User } = require('../models');
// 在文件顶部添加支付宝服务引用
const WechatPayService = require('../wechat/services/pay.service');
const AlipayService = require('../alipay/services/pay.service'); // 添加这一行
const TokenRechargeService = require('./bill/TokenRechargeService');
const PACKAGE_CONFIG = require('../config/packageConfig');

class OrderService {
  constructor() {
    this.wechatPay = new WechatPayService();
    this.alipay = new AlipayService(); // 添加这一行
    this.packageConfig = {};
    PACKAGE_CONFIG.packages.forEach(pkg => {
      this.packageConfig[pkg.id] = {
        id: pkg.id,
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
  
  /**
   * 创建订单
   * @param {number} userId - 用户ID
   * @param {number} packageId - 套餐ID
   * @param {string} clientIp - 客户端IP
   * @param {string} userAgent - 用户代理
   * @param {string} paymentMethod - 支付方式，'wechat'或'alipay'
   * @returns {Promise<Object>} 创建订单结果
   */
  async createOrder(userId, packageId, clientIp, userAgent, paymentMethod = 'wechat') {
    try {
      const packageInfo = this.packageConfig[packageId];
      if (!packageInfo) {
        throw new Error('无效的套餐类型');
      }
  
      const orderNo = this.generateOrderNo();
      const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期，与前端轮询时间一致
  
      // 根据支付方式选择不同的支付服务
      let paymentResult;
      if (paymentMethod === 'alipay') {
        // 调用支付宝支付
        paymentResult = await this.alipay.createUnifiedOrder({
          orderNo,
          amount: packageInfo.amount,
          description: `BananaAi:${packageInfo.name}`,
        });
      } else {
        // 默认使用微信支付
        paymentResult = await this.wechatPay.createUnifiedOrder({
          orderNo,
          amount: packageInfo.amount,
          description: `BananaAi:${packageInfo.id}`,
          clientIp
        });
      }

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || `创建${paymentMethod === 'alipay' ? '支付宝' : '微信'}支付订单失败`);
      }
      
      // 支付下单成功后，创建本地订单记录
      const order = await Order.create({
        userId,
        orderNo,
        packageId,
        packageName: packageInfo.name,
        amount: packageInfo.amount,
        tokensPurchased: packageInfo.tokens,
        status: 'pending',
        paymentMethod, // 使用传入的支付方式
        paymentChannel: paymentMethod === 'alipay' ? 'h5' : 'native', // 将'qrcode'改为'h5'
        clientIp,
        userAgent,
        expiredAt,
        prepayId: paymentResult.prepayId,
        qrCodeUrl: paymentResult.qrCodeUrl
      });

      return {
        success: true,
        order: {
          id: order.id,
          orderNo: order.orderNo,
          amount: order.amount,
          tokensPurchased: order.tokensPurchased,
          qrCodeUrl: paymentMethod === 'alipay' ? null : order.qrCodeUrl,
          formHtml: paymentMethod === 'alipay' ? paymentResult.formHtml : null,
          expiredAt: order.expiredAt
        }
      };
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }
  
  // 添加处理支付宝回调的方法
  async handleAlipayNotify(notifyData) {
    try {
      // 验证签名
      if (!this.alipay.verifyNotifySign(notifyData)) {
        throw new Error('签名验证失败');
      }

      const { out_trade_no: orderNo, trade_no: transactionId, trade_status } = notifyData;
      
      const order = await Order.findOne({ where: { orderNo } });
      if (!order) {
        throw new Error('订单不存在');
      }

      if (trade_status === 'TRADE_SUCCESS') {
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
      console.error('处理支付宝支付回调失败:', error);
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
      // 在handleWechatNotify方法中
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
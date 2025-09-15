const OrderService = require('../../services/OrderService');

class AlipayController {
  constructor() {
    this.orderService = new OrderService();
  }
  
  /**
   * 创建支付订单
   */
  async createOrder(req, res) {
    try {
      const { packageId } = req.body;
      
      const result = await this.orderService.createOrder(
        req.user.userId,
        packageId,
        req.ip || '127.0.0.1',
        req.headers['user-agent'],
        'alipay', // 指定支付方式为支付宝
      );

      res.json({
        success: true,
        orderId: result.order.orderNo,
        formHtml: result.order.formHtml, // 返回表单HTML而不是二维码URL
        amount: result.order.amount,
        tokensToAdd: result.order.tokensPurchased,
        packageName: result.order.packageName,
        message: '支付订单创建成功'
      });
    } catch (error) {
      console.error('创建支付宝支付订单错误:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || '创建支付订单失败' 
      });
    }
  }
  
  /**
   * 处理支付回调
   */
  async handleNotify(req, res) {
    try {
      await this.orderService.handleAlipayNotify(req.body);
      res.send('success');
    } catch (error) {
      console.error('支付宝支付回调处理错误:', error);
      res.send('fail');
    }
  }
  
  /**
   * 查询订单状态
   */
  async getOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.orderService.queryOrderStatus(orderId, req.user.userId);
      res.json({
        success: true,
        status: result.order.status,
        message: result.message || '查询成功'
      });
    } catch (error) {
      console.error('查询订单状态错误:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || '查询订单状态失败' 
      });
    }
  }
  
  /**
   * 前端主动更新订单状态
   */
  async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.orderService.queryOrderStatus(orderId, req.user.userId);
      res.json({
        success: true,
        status: result.order.status,
        tokensAdded: result.order.tokensPurchased,
        message: result.order.status === 'paid' ? '订单已支付' : '订单状态更新成功'
      });
    } catch (error) {
      console.error('更新订单状态错误:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || '更新订单状态失败' 
      });
    }
  }
}

module.exports = AlipayController;
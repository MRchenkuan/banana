const OrderService = require('../../services/OrderService');

class WechatPayController {
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
        req.headers['user-agent']
      );

      res.json({
        orderId: result.order.orderNo,
        qrCodeUrl: result.order.qrCodeUrl,
        amount: result.order.amount,
        tokensToAdd: result.order.tokensPurchased,
        packageName: result.order.packageName,
        message: '支付订单创建成功，请扫码支付'
      });
    } catch (error) {
      console.error('创建支付订单错误:', error);
      res.status(500).json({ error: error.message || '创建支付订单失败' });
    }
  }
  
  /**
   * 处理支付回调
   */
  async handleNotify(req, res) {
    try {
      await this.orderService.handleWechatNotify(req.body);
      res.set('Content-Type', 'application/xml');
      res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>');
    } catch (error) {
      console.error('微信支付回调处理错误:', error);
      res.set('Content-Type', 'application/xml');
      res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
    }
  }
  
  /**
   * 查询订单状态
   */
  /**
   * 查询和更新订单状态（合并接口）
   * 支持GET和POST请求
   */
  async checkOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.orderService.queryOrderStatus(orderId, req.user.userId);
      
      // 根据请求方法返回不同格式的响应
      if (req.method === 'GET') {
        // 原getOrderStatus的返回格式
        res.json(result.order);
      } else {
        // 原updateOrderStatus的返回格式
        res.json({
          success: true,
          status: result.order.status,
          tokensAdded: result.order.tokensPurchased,
          message: result.order.status === 'paid' ? '订单已支付' : '订单状态更新成功'
        });
      }
    } catch (error) {
      console.error('订单状态操作错误:', error);
      res.status(500).json({ 
        success: false,
        error: error.message || '订单状态操作失败' 
      });
    }
  }
  
  // 删除原来的getOrderStatus和updateOrderStatus方法
  
  /**
   * 模拟支付成功（仅开发环境）
   */
  async simulateSuccess(req, res) {
    try {
      const { orderId } = req.params;
      const result = await this.orderService.simulateSuccess(orderId, req.user.userId);
      res.json(result);
    } catch (error) {
      console.error('模拟支付错误:', error);
      res.status(500).json({ error: error.message || '模拟支付失败' });
    }
  }
}

module.exports = WechatPayController;
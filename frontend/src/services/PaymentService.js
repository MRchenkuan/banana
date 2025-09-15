class PaymentService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async getPackages() {
    return this.httpClient.get('/payplan/list');
  }

  // 微信支付
  async createWechatPaymentOrder(packageId) {
    return this.httpClient.post('/wechat/pay/create-order', { packageId });
  }

  // 支付宝支付 - 添加这个方法
  async createAlipayOrder(packageId) {
    return this.httpClient.post('/alipay/pay/create-order', { packageId });
  }

  async simulatePaymentSuccess(orderId) {
    return this.httpClient.post('/wechat/pay/simulate-success', { orderId });
  }

  // 修改PaymentService.js中的方法
  async getOrderStatus(orderId, paymentMethod = 'wechat') {
    const baseUrl = paymentMethod === 'alipay' ? '/alipay' : '/wechat';
    return this.httpClient.get(`${baseUrl}/pay/order-status/${orderId}`);
  }

  async updateOrderStatus(orderId, paymentMethod = 'wechat') {
    const baseUrl = paymentMethod === 'alipay' ? '/alipay' : '/wechat';
    return this.httpClient.post(`${baseUrl}/pay/order-status/${orderId}`);
  }
  
  // 获取充值记录
  async getPaymentHistory() {
    return this.httpClient.get('/payment/history');
  }
}

export default PaymentService;
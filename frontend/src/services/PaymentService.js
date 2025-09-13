class PaymentService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async getPackages() {
    return this.httpClient.get('/payplan/list');
  }

  async createPaymentOrder(packageId) {
    return this.httpClient.post('/wechat/pay/create-order', { packageId });
  }

  async simulatePaymentSuccess(orderId) {
    return this.httpClient.post('/wechat/pay/simulate-success', { orderId });
  }

  async getOrderStatus(orderId) {
    return this.httpClient.get(`/wechat/pay/order-status/${orderId}`);
  }

  async updateOrderStatus(orderId) {
    return this.httpClient.post(`/wechat/pay/update-order-status/${orderId}`);
  }
}

export default PaymentService;
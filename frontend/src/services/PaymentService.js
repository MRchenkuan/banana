class PaymentService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async createPaymentOrder(amount) {
    return this.httpClient.post('/api/wechat/pay/create-order', { amount });
  }

  async simulatePaymentSuccess(orderId) {
    return this.httpClient.post('/api/wechat/pay/simulate-success', { orderId });
  }

  async getOrderStatus(orderId) {
    return this.httpClient.get(`/api/wechat/pay/order-status/${orderId}`);
  }
}

export default PaymentService;
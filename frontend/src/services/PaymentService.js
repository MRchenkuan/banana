class PaymentService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async createPaymentOrder(amount = 10) {
    return this.httpClient.post('/payment/create-order', { amount });
  }

  async simulatePaymentSuccess(orderId) {
    return this.httpClient.post('/payment/simulate-success', { orderId });
  }

  async getOrderStatus(orderId) {
    return this.httpClient.get(`/payment/order-status/${orderId}`);
  }
}

export default PaymentService;
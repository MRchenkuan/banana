class UserService {
  constructor(httpClient) {
    this.httpClient = httpClient;
  }

  async getUserBalance() {
    return this.httpClient.get('/user/balance');
  }

  async getUserUsageStats() {
    return this.httpClient.get('/user/usage-stats');
  }

  async getUserStats() {
    return this.httpClient.get('/user/stats');
  }

  async getTokenUsageHistory(startDate, endDate) {
    return this.httpClient.get(`/user/token-usage-history?startDate=${startDate}&endDate=${endDate}`);
  }
}

export default UserService;
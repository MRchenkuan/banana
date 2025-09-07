import HttpClient from './core/HttpClient';
import ChatService from './ChatService';
import SessionService from './SessionService';
import PaymentService from './PaymentService';
import UserService from './UserService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    // 初始化HTTP客户端
    this.httpClient = new HttpClient(API_BASE_URL);
    
    // 初始化各个服务
    this.chat = new ChatService(this.httpClient, API_BASE_URL);
    this.session = new SessionService(this.httpClient);
    this.payment = new PaymentService(this.httpClient);
    this.user = new UserService(this.httpClient);
  }

  // 认证相关方法
  setAuthToken(token) {
    this.httpClient.setAuthToken(token);
  }

  // 直接访问服务的方法
  get(url, config = {}) {
    return this.httpClient.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.httpClient.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.httpClient.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.httpClient.delete(url, config);
  }
}

const api = new ApiService();
export default api;
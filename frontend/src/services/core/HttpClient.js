import axios from 'axios';
import { message } from 'antd';

class HttpClient {
  constructor(baseURL, timeout = 30000) {
    this.client = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );
  }

  handleResponseError(error) {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 只在非登录页面时重定向
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
        message.error('登录已过期，请重新登录');
      }
    } else if (error.response?.status === 402) {
      message.error('Token 余额不足，请充值后继续使用');
    } else if (error.response?.status >= 500) {
      message.error('服务器错误，请稍后重试');
    }
  }

  setAuthToken(token) {
    if (token) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  get(url, config = {}) {
    return this.client.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.client.delete(url, config);
  }
}

export default HttpClient;
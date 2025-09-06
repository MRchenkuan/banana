import axios from 'axios';
import { message } from 'antd';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 请求拦截器
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          message.error('登录已过期，请重新登录');
        } else if (error.response?.status === 402) {
          message.error('Token 余额不足，请充值后继续使用');
        } else if (error.response?.status >= 500) {
          message.error('服务器错误，请稍后重试');
        }
        return Promise.reject(error);
      }
    );
  }

  setAuthToken(token) {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  get(url, config = {}) {
    return this.api.get(url, config);
  }

  post(url, data = {}, config = {}) {
    return this.api.post(url, data, config);
  }

  put(url, data = {}, config = {}) {
    return this.api.put(url, data, config);
  }

  delete(url, config = {}) {
    return this.api.delete(url, config);
  }

  async getChatHistory(page = 1, limit = 20) {
    return this.get(`/chat/history?page=${page}&limit=${limit}`);
  }

  // 会话管理 API
  async getSessions() {
    return this.get('/sessions');
  }

  async createSession(title = '新对话') {
    return this.post('/sessions', { title });
  }

  async deleteSession(sessionId) {
    return this.delete(`/sessions/${sessionId}`);
  }

  async updateSessionTitle(sessionId, title) {
    return this.put(`/sessions/${sessionId}`, { title });
  }

  async getSessionMessages(sessionId, page = 1, limit = 20) {
    return this.get(`/sessions/${sessionId}/messages?page=${page}&limit=${limit}`);
  }

  // 支付相关 API
  async createPaymentOrder(amount = 10) {
    return this.post('/payment/create-order', { amount });
  }

  async simulatePaymentSuccess(orderId) {
    return this.post('/payment/simulate-success', { orderId });
  }

  async getOrderStatus(orderId) {
    return this.get(`/payment/order-status/${orderId}`);
  }

  // 用户相关 API
  async getUserBalance() {
    return this.get('/user/balance');
  }

  async getUserUsageStats() {
    return this.get('/user/usage-stats');
  }

  // 添加缺失的方法
  async getUserStats() {
    return this.get('/user/stats');
  }

  async getTokenUsageHistory(startDate, endDate) {
    return this.get(`/user/token-usage-history?startDate=${startDate}&endDate=${endDate}`);
  }

  // 流式文本消息发送
  async sendTextMessageStream(message, sessionId = null, onChunk, onComplete, onError){
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/chat/text-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message,
          sessionId
        })
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '网络请求失败';
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // 如果不是JSON格式，使用默认错误消息
        }
        
        throw new Error(errorMessage);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
  
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // 在 sendTextMessageStream 方法中，第180行附近
              if (data.type === 'text') {
                onChunk && onChunk(data.content, data.tokens);  // 改为 data.content 和 data.tokens
              } else if (data.type === 'complete') {
                onComplete && onComplete(data);
                return; // 成功完成，退出
              } else if (data.type === 'error') {
                onError && onError(data.error || '流式处理出现错误');
                return; // 错误处理完成，退出
              } else if(data.type ==='title'){
                // 可以单独处理 title
              }
            } catch (parseError) {
              console.error('解析SSE数据失败:', parseError, '原始数据:', line);
              // 继续处理其他行，不中断整个流程
            }
          }
        }
      }
    } catch (error) {
      console.error('流式请求失败:', error);
      onError && onError(error.message || '网络连接失败，请检查网络设置');
    }
  }
  
  // 流式图片消息
  async sendImageMessageStream(message, imageFile, sessionId, onChunk, onComplete, onError) {
    const formData = new FormData();
    formData.append('message', message);
    formData.append('image', imageFile);
    if (sessionId) {
      formData.append('sessionId', sessionId);
    }
  
    try {
      const response = await fetch(`${API_BASE_URL}/chat/image-stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
  
      if (!response.ok) {
        // 修复：解析后端返回的具体错误信息
        const errorText = await response.text();
        let errorMessage = '网络请求失败';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // 如果不是JSON格式，使用默认错误消息
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        
        throw new Error(errorMessage);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
  
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // 在 sendImageMessageStream 方法中，第254行附近
              if (data.type === 'text') {
                onChunk(data.content, data.tokens);  // 改为 data.content 和 data.tokens
              } else if (data.type === 'complete') {
                onComplete({
                  tokensUsed: data.token,
                  remainingBalance: data.remainingBalance,
                });
              } else if (data.type === 'error') {
                onError(data.error);
                return;
              }
            } catch (parseError) {
              console.error('解析SSE数据失败:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('流式图片请求失败:', error);
      onError(error.message || '网络请求失败');
    }
  }
}

const api = new ApiService();
export default api;
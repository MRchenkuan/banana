// 简单的事件管理器
class TokenMonitorEvents {
  constructor() {
    this.listeners = [];
  }

  // 订阅token更新事件
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // 发布token数据
  publish(tokenData) {
    this.listeners.forEach(callback => callback(tokenData));
  }
}

export const tokenMonitorEvents = new TokenMonitorEvents();
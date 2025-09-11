/**
 * URL配置工具
 * 提供动态获取当前域名和端口的方法
 */
class UrlConfig {
  /**
   * 获取当前页面的baseUrl
   * @returns {string} 当前页面的baseUrl
   */
  static getCurrentBaseUrl() {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  /**
   * 获取API baseUrl
   * @returns {string} API的baseUrl
   */
  static getApiBaseUrl() {
    // 可以根据环境变量或当前域名动态决定
    const currentHost = window.location.host;
    
    // 如果是开发环境
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    }
    
    // 生产环境，假设API和前端在同一域名下
    return `${window.location.protocol}//${window.location.host}/api`;
  }
  
  /**
   * 构建完整的页面URL
   * @param {string} path - 页面路径
   * @returns {string} 完整的页面URL
   */
  static buildPageUrl(path) {
    const baseUrl = this.getCurrentBaseUrl();
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
  
  /**
   * 检测当前是否为移动设备访问
   * @returns {boolean} 是否为移动设备
   */
  static isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * 获取适合的二维码扫描页面URL
   * @param {string} scene - 场景值
   * @returns {string} 二维码扫描页面URL
   */
  static getQRScanUrl(scene) {
    return this.buildPageUrl(`/wechat/qr-scan?scene=${scene}`);
  }
}

export default UrlConfig;
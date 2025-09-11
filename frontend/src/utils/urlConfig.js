/**
 * URL配置工具
 * 提供动态获取当前域名和端口的方法
 */
class UrlConfig {
  /**
   * 获取当前页面的基础URL（协议+域名+端口）
   * @returns {string} 如：http://localhost:3000 或 https://example.com
   */
  static getCurrentDomainUrl() {
    return `${window.location.protocol}//${window.location.host}`;
  }
  
  /**
   * 获取后端API服务的基础URL
   * @returns {string} API服务的完整URL
   */
  static getBackendApiUrl() {
    // 开发环境：优先使用环境变量，否则使用当前域名的3001端口
      return process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:3001/api`;
  }
  
  /**
   * 构建完整的前端页面URL
   * @param {string} path - 页面路径
   * @returns {string} 完整的页面URL
   */
  static buildFrontendPageUrl(path) {
    const baseUrl = this.getCurrentDomainUrl();
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }
  
  /**
   * 检测当前访问设备是否为移动设备
   * @returns {boolean} 是否为移动设备
   */
  static isAccessFromMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * 获取微信二维码扫描页面的完整URL
   * @param {string} scene - 场景值
   * @returns {string} 二维码扫描页面URL
   */
  static getWechatQRScanPageUrl(scene) {
    return this.buildFrontendPageUrl(`/wechat/qr-scan?scene=${scene}`);
  }
}

export default UrlConfig;
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rosService = require('./RosService');

class FileManagementService {
  constructor() {
    // 配置S3客户端
    this.s3 = new AWS.S3({
      endpoint: process.env.ROS_ENDPOINT,
      accessKeyId: process.env.ROS_ACCESS_KEY_ID,
      secretAccessKey: process.env.ROS_SECRET_ACCESS_KEY,
      region: process.env.ROS_REGION,
      s3ForcePathStyle: true,
      signatureVersion: 'v4'
    });
  }
  
  /**
   * 从ROS下载图片到临时文件
   * @param {string} rosKey - ROS文件键
   * @returns {string} 临时文件路径
   */
  async downloadImageFromRos(rosKey) {
    const tempDir = os.tmpdir();
    const tempFileName = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(rosKey)}`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    try {
      // 从ROS下载文件
      const result = await this.s3.getObject({
        Bucket: process.env.ROS_BUCKET_NAME,
        Key: rosKey
      }).promise();
      
      // 写入临时文件
      fs.writeFileSync(tempFilePath, result.Body);
      console.log('从ROS下载图片到临时文件:', tempFilePath);
      
      return tempFilePath;
    } catch (error) {
      // 如果出错，确保清理可能已创建的临时文件
      await this.cleanupTempFile(tempFilePath);
      console.error('从ROS下载图片失败:', error);
      throw new Error('图片下载失败');
    }
  }
  
  /**
   * 安全清理临时文件
   * @param {string} tempFilePath - 临时文件路径
   */
  async cleanupTempFile(tempFilePath) {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        console.log('已删除临时图片文件:', tempFilePath);
      }
    } catch (cleanupError) {
      console.error('清理临时文件失败:', cleanupError);
      // 不抛出异常，避免影响主流程
    }
  }
  
  /**
   * 使用临时文件执行回调，确保文件清理
   * @param {string} rosKey - ROS文件键
   * @param {Function} callback - 回调函数
   * @returns {*} 回调函数的返回值
   */
  async withTempFile(rosKey, callback) {
    let tempImagePath = null;
    try {
      tempImagePath = await this.downloadImageFromRos(rosKey);
      return await callback(tempImagePath);
    } finally {
      // 无论成功还是失败都清理临时文件
      if (tempImagePath) {
        await this.cleanupTempFile(tempImagePath);
      }
    }
  }
  
  /**
   * 删除ROS文件
   * @param {string} rosKey - ROS文件键
   */
  async deleteRosFile(rosKey) {
    try {
      await rosService.deleteFile(rosKey);
      console.log('已删除ROS文件:', rosKey);
    } catch (error) {
      console.error('删除ROS文件失败:', error);
      throw error;
    }
  }
}

module.exports = new FileManagementService();
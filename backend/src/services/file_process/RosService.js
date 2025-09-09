const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto'); // 新增crypto模块

class ROSService {
  constructor() {
    // 雨云ROS使用S3兼容API
    this.s3 = new AWS.S3({
      endpoint: process.env.ROS_ENDPOINT || 'https://ros.rainyun.com',
      accessKeyId: process.env.ROS_ACCESS_KEY_ID,
      secretAccessKey: process.env.ROS_SECRET_ACCESS_KEY,
      region: process.env.ROS_REGION || 'us-east-1', // 雨云默认区域
      s3ForcePathStyle: true, // 强制使用路径样式
      signatureVersion: 'v4'
    });
    
    this.bucketName = process.env.ROS_BUCKET_NAME;
    this.bucketDomain = process.env.ROS_BUCKET_DOMAIN || `https://${this.bucketName}.${process.env.ROS_ENDPOINT?.replace('https://', '') || 'ros.rainyun.com'}`;
  }

  /**
   * 上传文件到雨云ROS
   * @param {string} localFilePath - 本地文件路径
   * @param {string} key - ROS存储的key（路径）
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadFile(localFilePath, key, options = {}) {
    try {
      console.log('开始上传文件到雨云ROS:', { localFilePath, key });
      
      // 检查本地文件是否存在
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`本地文件不存在: ${localFilePath}`);
      }
      
      // 读取文件
      const fileContent = fs.readFileSync(localFilePath);
      const contentType = this.getContentType(localFilePath);
      
      // 设置上传参数
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: 'max-age=31536000', // 缓存一年
        ...options.s3Params
      };
      
      // 上传文件
      const result = await this.s3.upload(uploadParams).promise();
      
      console.log('雨云ROS上传成功:', {
        key: result.Key,
        location: result.Location,
        etag: result.ETag
      });
      
      // 删除本地临时文件
      if (options.deleteLocal !== false) {
        try {
          fs.unlinkSync(localFilePath);
          console.log('已删除本地临时文件:', localFilePath);
        } catch (error) {
          console.warn('删除本地文件失败:', error.message);
        }
      }
      
      return {
        success: true,
        url: this.getPublicUrl(key),
        key: key,
        location: result.Location,
        etag: result.ETag,
        size: fileContent.length
      };
      
    } catch (error) {
      console.error('雨云ROS上传失败:', error);
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 上传Buffer到雨云ROS
   * @param {Buffer} buffer - 文件Buffer
   * @param {string} key - ROS存储的key
   * @param {Object} options - 上传选项
   * @returns {Promise<Object>} 上传结果
   */
  async uploadBuffer(buffer, key, options = {}) {
    try {
      // 检查是否启用本地保存模式（调试用）
      if (process.env.IMAGE_SAVE_LOCAL === 'true') {
        console.log('本地保存模式已启用，跳过ROS上传:', { key, size: buffer.length });
        
        // 创建本地保存目录
        const localDir = path.join(__dirname, '../../../uploads/debug-images');
        if (!fs.existsSync(localDir)) {
          fs.mkdirSync(localDir, { recursive: true });
        }
        
        // 从key中提取文件名，确保包含扩展名
        let fileName = path.basename(key);
        
        // 如果文件名没有扩展名，根据 contentType 添加
        if (!path.extname(fileName) && options.contentType) {
          const mimeToExt = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg', 
            'image/png': '.png',
            'image/gif': '.gif',
            'image/webp': '.webp',
            'image/bmp': '.bmp',
            'image/svg+xml': '.svg'
          };
          const ext = mimeToExt[options.contentType] || '.jpg';
          fileName += ext;
        }
        
        const localPath = path.join(localDir, fileName);
        
        // 保存到本地
        fs.writeFileSync(localPath, buffer);
        
        console.log('图片已保存到本地调试目录:', localPath);
        
        // 返回本地访问URL（模拟ROS返回格式）
        const localUrl = `http://localhost:${process.env.PORT || 3001}/uploads/debug-images/${fileName}`;
        
        return {
          success: true,
          url: localUrl,
          key: key,
          location: localUrl,
          etag: `"local-${Date.now()}"`,
          size: buffer.length,
          mode: 'local-debug' // 标识这是本地调试模式
        };
      }
      
      // 原有的ROS上传逻辑
      console.log('开始上传Buffer到雨云ROS:', { key, size: buffer.length });
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: options.contentType || 'application/octet-stream',
        CacheControl: 'max-age=31536000',
        ...options.s3Params
      };
      
      const result = await this.s3.upload(uploadParams).promise();
      
      console.log('雨云ROS Buffer上传成功:', {
        key: result.Key,
        location: result.Location
      });
      
      return {
        success: true,
        url: this.getPublicUrl(key),
        key: key,
        location: result.Location,
        etag: result.ETag,
        size: buffer.length
      };
      
    } catch (error) {
      console.error('雨云ROS Buffer上传失败:', error);
      throw new Error(`Buffer上传失败: ${error.message}`);
    }
  }

  /**
   * 生成安全的图片存储key
   * 格式: prefix/YYYY/MM/DD/32位hash.ext
   * @param {string} originalName - 原始文件名
   * @param {string} prefix - 路径前缀
   * @param {string} userId - 用户ID（可选，用于增加hash唯一性）
   * @returns {string} ROS key
   */
  generateImageKey(originalName, prefix = 'images', userId = null) {
    const ext = path.extname(originalName).toLowerCase();
    const now = new Date();
    
    // 按日期分文件夹：YYYY/MM/DD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePath = `${year}/${month}/${day}`;
    
    // 生成32位hash文件名
    const hashInput = [
      originalName,
      Date.now().toString(),
      Math.random().toString(),
      userId || 'anonymous',
      process.hrtime.bigint().toString() // 高精度时间戳
    ].join('|');
    
    const hash = crypto.createHash('sha256')
      .update(hashInput)
      .digest('hex')
      .substring(0, 32); // 取前32位
    
    const filename = `${hash}${ext}`;
    
    return `${prefix}/${datePath}/${filename}`;
  }

  /**
   * 生成带用户ID的安全key（用于聊天图片）
   * @param {string} originalName - 原始文件名
   * @param {string|number} userId - 用户ID
   * @returns {string} ROS key
   */
  generateChatImageKey(originalName, userId) {
    return this.generateImageKey(originalName, 'chat-images', userId.toString());
  }

  /**
   * 生成公共资源key（用于静态资源）
   * @param {string} originalName - 原始文件名
   * @returns {string} ROS key
   */
  generatePublicImageKey(originalName) {
    return this.generateImageKey(originalName, 'public-images');
  }

  /**
   * 获取文件的公网访问URL
   * @param {string} key - ROS key
   * @returns {string} 公网URL
   */
  getPublicUrl(key) {
    return `${this.bucketDomain}/${key}`;
  }

  /**
   * 删除ROS文件
   * @param {string} key - ROS key
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteFile(key) {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
      
      console.log('雨云ROS文件删除成功:', key);
      return true;
    } catch (error) {
      console.error('雨云ROS文件删除失败:', error);
      return false;
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} key - ROS key
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(key) {
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
      return true;
    } catch (error) {
      if (error.code === 'NotFound' || error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * 获取文件信息
   * @param {string} key - ROS key
   * @returns {Promise<Object>} 文件信息
   */
  async getFileInfo(key) {
    try {
      const result = await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key
      }).promise();
      
      return {
        size: result.ContentLength,
        contentType: result.ContentType,
        lastModified: result.LastModified,
        etag: result.ETag
      };
    } catch (error) {
      console.error('获取雨云ROS文件信息失败:', error);
      throw error;
    }
  }

  /**
   * 根据文件扩展名获取Content-Type
   * @param {string} filePath - 文件路径
   * @returns {string} Content-Type
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp',
      '.ico': 'image/x-icon'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * 生成预签名上传URL（用于前端直传）
   * @param {string} key - ROS key
   * @param {Object} options - 选项
   * @returns {Promise<string>} 预签名URL
   */
  async generatePresignedUploadUrl(key, options = {}) {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: key,
        Expires: options.expires || 3600, // 默认1小时过期
        ContentType: options.contentType || 'image/jpeg'
      };
      
      const url = await this.s3.getSignedUrlPromise('putObject', params);
      return url;
    } catch (error) {
      console.error('生成预签名URL失败:', error);
      throw error;
    }
  }
}

module.exports = new ROSService();
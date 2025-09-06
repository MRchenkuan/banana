const fs = require('fs');
const path = require('path');
const os = require('os');
const BaseGeminiService = require('./BaseGeminiService');
const fileManagementService = require('../file_process/FileManagementService');

class GeminiImageService extends BaseGeminiService {
  
  /**
   * 从图片生成图片（核心AI调用方法）
   * 移除流式处理逻辑，专注AI服务调用
   */
  async generateImageFromImage(textPrompt, imagePath, options = {}) {
    try {
      const imageData = fs.readFileSync(imagePath);
      const mimeType = this.getMimeType(imagePath);
      
      // 处理图片数据
      const processedData = await this.processImageData(imageData, imageData, mimeType, options);
      
      // 构建AI请求
      const prompt = `${textPrompt}\n\n请基于上传的图片生成相关内容。`;
      
      // 调用AI服务
      const response = await this.callGeminiAPI({
        prompt,
        imageData: processedData,
        mimeType,
        ...options
      });
      
      return this.parseAIResponse(response);
      
    } catch (error) {
      console.error('AI图片生成错误:', error);
      throw error;
    }
  }

  /**
   * 解析AI响应
   */
  parseAIResponse(response) {
    const results = [];
    
    // 解析文本内容
    if (response.text) {
      results.push({
        type: 'text',
        content: response.text
      });
    }
    
    // 解析图片内容
    if (response.images) {
      response.images.forEach(image => {
        results.push({
          type: 'image',
          link: image.url,
          mimeType: image.mimeType,
          size: image.size
        });
      });
    }
    
    return results;
  }
  
  /**
   * 处理图片数据，根据配置选择最优处理策略
   * @param {string} imageData - base64图片数据
   * @param {Buffer} buffer - 图片buffer
   * @param {string} mimeType - MIME类型
   * @param {Object} options - 处理选项
   * @returns {Object} 处理结果
   */
  async processImageData(imageData, buffer, mimeType, options = {}) {
    const {
      sizeThreshold = this._getOptimalThreshold(),
      outputDir = path.join(__dirname, this.config.imageProcessing.tempDir),
      fallbackToLocal = this.config.imageProcessing.fallbackToLocal,
      user = null
    } = options;

    try {
      const rosService = require('../file_process/RosService');
      const ext = this.getExtByMimeType(mimeType);
      const filename = `${Date.now()}.${ext}`;
      const imageKey = rosService.generateImageKey(filename, 'gemini', user?.id);
      
      let rosUrl;
        
      if (buffer.length <= sizeThreshold) {
        // 小图片：直接上传Buffer
        console.log(`小图片 ${buffer.length} 字节，直接上传到ROS`);
        rosUrl = await rosService.uploadBuffer(buffer, imageKey, mimeType);
      } else {
        // 大图片：先保存临时文件再上传
        console.log(`大图片 ${buffer.length} 字节，使用临时文件上传到ROS`);
        const tempFileName = `temp-${Date.now()}.png`;
        const tempPath = path.join(outputDir, tempFileName);
        
        // 确保临时目录存在
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(tempPath, buffer);
        rosUrl = await rosService.uploadFile(tempPath, imageKey);
        
        // 清理临时文件
        fs.unlinkSync(tempPath);
      }
      
      console.log(`图片已上传到ROS: ${rosUrl}`);
      return {
        type: 'image',
        link: rosUrl,
        data: imageData,
        mimeType: mimeType,
        size: buffer.length,
      };
      
    } catch (error) {
      console.error('图片处理失败:', error);
      
      // 错误回退策略
      if (fallbackToLocal) {
        return this._fallbackToLocal(imageData, buffer, mimeType, error);
      }
      
      throw error;
    }
  }

  // ==================== 错误处理方法 ====================
  
  /**
   * 处理错误情况下的ROS文件清理
   * @param {string} rosKey - ROS文件键
   * @param {Object} chatMessage - 聊天消息对象
   */
  async handleErrorCleanup(rosKey, chatMessage) {
    if (!chatMessage && rosKey) {
      try {
        await fileManagementService.deleteRosFile(rosKey);
        console.log('初始化失败，已删除ROS图片文件:', rosKey);
      } catch (deleteError) {
        console.error('删除ROS文件失败:', deleteError);
      }
    }
  }

  // ==================== 工具方法 ====================
  
  /**
   * 获取文件MIME类型
   * @param {string} filePath - 文件路径
   * @returns {string} MIME类型
   */
  getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    return this.config.imageProcessing.mimeTypes[ext] || this.config.imageProcessing.defaultMimeType;
  }

  /**
   * 根据MIME类型获取文件扩展名
   * @param {string} mimeType - MIME类型
   * @returns {string} 文件扩展名
   */
  getExtByMimeType(mimeType) {
    return mimeType.split('/').at(-1);
  }

  // ==================== 私有方法 ====================
  
  /**
   * 根据系统内存动态调整阈值
   * @private
   * @returns {number} 最优阈值
   */
  _getOptimalThreshold() {
    if (!this.config.memoryOptimization.enabled) {
      return this.config.imageProcessing.sizeThreshold.medium;
    }

    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsageRatio = (totalMemory - freeMemory) / totalMemory;
    
    const thresholds = this.config.memoryOptimization.thresholds;
    const adaptiveThresholds = this.config.memoryOptimization.adaptiveThresholds;
    
    if (memoryUsageRatio > thresholds.high) {
      return adaptiveThresholds.high; // 内存紧张时降低阈值
    } else if (memoryUsageRatio < thresholds.low) {
      return adaptiveThresholds.low; // 内存充足时提高阈值
    }
    return adaptiveThresholds.normal; // 默认阈值
  }

  /**
   * 本地回退处理
   * @private
   * @param {string} imageData - 图片数据
   * @param {Buffer} buffer - 图片buffer
   * @param {string} mimeType - MIME类型
   * @param {Error} error - 原始错误
   * @returns {Object} 回退结果
   */
  _fallbackToLocal(imageData, buffer, mimeType, error) {
    console.log('回退到本地保存');
    const fallbackPath = `gemini-generated-image-fallback-${Date.now()}.png`;
    fs.writeFileSync(fallbackPath, buffer);
    console.log(`图片已保存至: ${fallbackPath}`);
    
    return {
      type: 'image',
      link: fallbackPath,
      data: imageData,
      mimeType: mimeType,
      size: buffer.length,
      error: error.message,
      linkType: 'local_file_path'
    };
  }
}

module.exports = new GeminiImageService();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const BaseGeminiService = require('./BaseGeminiService');
const fileManagementService = require('../file_process/FileManagementService');

class GeminiImageService extends BaseGeminiService {
  
  /**
   * 从图片生成内容（核心AI调用方法）
   */
  async * generateImageFromImage(textPrompt, imageArray=[], options = {}) {
    try {
      // 按照官方格式构建图片数据
      const imageParts = await Promise.all(imageArray.map(async (image) => {
        const data = fs.readFileSync(image, { encoding: 'base64' });
        const mimeType = this.getMimeType(image);
        return {
          inlineData: {
            data,
            mimeType
          }
        };
      }));

      // 按照官方格式构建 contents
      const config = {
        // 控制生成内容的随机性和创造性 (0.0-2.0)
        // 0.0: 最确定性的输出，适合事实性任务
        // 1.0: 平衡的创造性，适合大多数场景
        // 2.0: 最大创造性，适合艺术创作
        temperature: 0.8,
        
        // 限制生成响应的最大token数量
        // 控制输出长度，防止过长的响应
        maxOutputTokens: 500,
        
        // 指定响应的模态类型
        // 'IMAGE': 生成图片
        // 'TEXT': 生成文本
        // 可以同时指定多种模态
        responseModalities: ['IMAGE','TEXT'],
        
        // 控制生成图片的尺寸
        // '1K': 1024像素 (较快生成，较小文件)
        // '2K': 2048像素 (较慢生成，较大文件，更高质量)
        // 注意：Imagen 3 模型不支持此参数
        imageSize: '1K',
        // 安全设置 - 控制内容安全过滤
        // 可以添加以下安全配置来阻止不当内容：
        safetySettings: [
          {
            // 仇恨言论检测
            category: 'HARM_CATEGORY_HARASSMENT',
            // 阻止中等及以上风险的内容
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 危险内容检测
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 骚扰内容检测
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 性暴露内容检测
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 性暴露内容检测
            category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ],
        
        // 其他可选配置参数：
        
        // topK: 40,  // 控制token选择的多样性 (1-1000)
        // topP: 0.95, // 核采样参数，控制累积概率阈值 (0.0-1.0)
        
        // stopSequences: ['END', 'STOP'], // 停止生成的序列
        
        // responseMimeType: 'application/json', // 指定响应格式
        
        // 图像生成特定参数：
        // safetyFilterLevel: 'BLOCK_MEDIUM_AND_ABOVE', // 图像安全过滤级别
        // includeSafetyAttributes: true, // 是否包含安全属性评分
        // enhancePrompt: false, // 是否使用提示词重写逻辑
        
        // 思考模式参数（适用于支持的模型）：
        // thinkingBudget: 1000, // 思考预算token数 (0=禁用, -1=自动)
      };

      // 使用官方格式调用API
      yield * await this.ai.models.generateContentStream({
        model:'gemini-2.5-flash-image-preview',
        contents:[{
          role: 'user',
          parts: [
            { text: textPrompt },
            ...imageParts // 添加图片数据
          ],
        }],
        config,
      });
      
    } catch (error) {
      console.error('AI图片生成错误:', error);
      throw new Error('图片生成出错，请稍后重试');
    }
  }

  /**
   * 解析AI响应并处理图片持久化
   */
  async parseAIResponse(response, options = {}) {
    const results = [];
    const { user } = options;
    
    // 解析文本内容
    if (response && response.text) {
      results.push({
        type: 'text',
        content: response.text
      });
    }
    
    // 如果AI生成了图片，进行ROS持久化
    if (response.images && response.images.length > 0) {
      for (const image of response.images) {
        try {
          const rosUrl = await this.saveImageToRos(image, user);
          results.push({
            type: 'image',
            link: rosUrl,
            mimeType: image.mimeType,
            size: image.size
          });
        } catch (error) {
          console.error('图片保存到ROS失败:', error);
          // 继续处理其他结果，不中断整个流程
        }
      }
    }
    
    return results;
  }
  
  /**
   * 处理图片数据，根据配置选择最优处理策略
   * 保留原有的ROS上传逻辑，但简化复杂的阈值判断
   */
  async processImageData(imageData, buffer, mimeType, options = {}) {
    const { user = null } = options;

    try {
      const rosService = require('../file_process/RosService');
      const ext = this.getExtByMimeType(mimeType);
      const filename = `${Date.now()}.${ext}`;
      const imageKey = rosService.generateImageKey(filename, 'gemini', user?.id);
      
      // 直接上传Buffer到ROS（简化逻辑）
      console.log(`上传图片到ROS，大小: ${buffer.length} 字节`);
      const rosUrl = await rosService.uploadBuffer(buffer, imageKey, mimeType);
      
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
      throw error;
    }
  }

  /**
   * 将图片保存到ROS（优化版本）
   */
  async saveImageToRos(imageBuffer, user = null) {
    try {
      const rosService = require('../file_process/RosService');
      const filename = `gemini-${Date.now()}.png`;
      const imageKey = rosService.generateImageKey(filename, 'gemini', user?.id);
      
      // 直接上传Buffer到ROS
      const rosUrl = await rosService.uploadBuffer(imageBuffer, imageKey, 'image/png');
      console.log(`AI生成图片已保存到ROS: ${rosUrl}`);
      
      return rosUrl;
    } catch (error) {
      console.error('ROS保存失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取文件MIME类型
   */
  getMimeType(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
  
  /**
   * 根据MIME类型获取文件扩展名
   */
  getExtByMimeType(mimeType) {
    return mimeType.split('/').at(-1);
  }
  
  /**
   * 错误清理 - 删除已上传的ROS文件
   */
  async cleanupRosFile(rosKey) {
    if (rosKey) {
      try {
        await fileManagementService.deleteRosFile(rosKey);
        console.log('已清理ROS文件:', rosKey);
      } catch (error) {
        console.error('清理ROS文件失败:', error);
      }
    }
  }
}

module.exports = new GeminiImageService();
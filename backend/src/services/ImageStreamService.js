const GeminiImageService = require('./gemini/GeminiImageService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const fileManagementService = require('./file_process/FileManagementService');

class ImageStreamService {
  
  /**
   * 处理图片流式生成（生成器模式）
   * @param {Object} params - 参数对象
   * @param {string} params.message - 用户消息
   * @param {string} params.imageUrl - 图片URL
   * @param {string} params.rosKey - ROS文件键
   * @param {Object} params.user - 用户对象
   * @returns {AsyncGenerator} 流式结果生成器
   */
  async* processImageStream({ message, imageUrl, rosKey, user }) {
    // 1. 输入验证
    ChatValidation.validateImageMessage(message, imageUrl);
    
    // 2. Token预估和余额检查
    const estimatedTokens = TokenManager.estimateTokens(message) + 150;
    await TokenManager.checkBalance(user, estimatedTokens);
    
    try {
      // 3. 使用临时文件处理图片
      const result = await fileManagementService.withTempFile(rosKey, async (tempImagePath) => {
        // 收集所有结果
        const chunks = [];
        for await (const chunk of this.generateImageContent(message, tempImagePath, user)) {
          chunks.push(chunk);
        }
        return chunks;
      });
      
      // 4. 逐个yield结果
      for (const chunk of result) {
        yield chunk;
      }
      
    } catch (error) {
      console.error('图片流处理服务错误:', error);
      throw error;
    }
  }

  /**
   * 生成图片内容（核心业务逻辑）
   */
  async* generateImageContent(message, imagePath, user) {
    // 调用AI服务生成内容
    const results = await GeminiImageService.generateImageFromImage(message, imagePath, { user });
    
    let totalTokensUsed = 0;
    let fullTextResponse = '';
    
    // 处理AI返回的结果
    for (const result of results) {
      if (result.type === 'text') {
        const textContent = result.content;
        fullTextResponse += textContent;
        
        const estimatedTokens = TokenManager.estimateTokens(textContent);
        totalTokensUsed += estimatedTokens;
        
        const chunk = {
          type: 'text',
          content: textContent,
          tokens: estimatedTokens,
          metadata: { 
            estimatedTokens,
            totalTokensUsed,
            fullTextResponse
          }
        };
        
        // 直接yield，不使用回调
        yield chunk;
        
      } else if (result.type === 'image') {
        const imageTokens = 50;
        totalTokensUsed += imageTokens;
        
        const chunk = {
          type: 'image',
          content: result.link,
          tokens: imageTokens,
          metadata: {
            mimeType: result.mimeType,
            size: result.size,
            totalTokensUsed
          }
        };
        
        // 直接yield，不使用回调
        yield chunk;
      }
    }
    
    // 最后yield完成状态
    yield {
      type: 'complete',
      success: true,
      totalTokensUsed,
      fullTextResponse,
      metadata: { final: true }
    };
  }

  /**
   * 错误清理
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
}

module.exports = new ImageStreamService();
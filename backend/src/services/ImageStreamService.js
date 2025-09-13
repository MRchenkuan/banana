const fs = require('fs');
const path = require('path');
const GeminiImageService = require('./gemini/GeminiImageService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const fileManagementService = require('./file_process/FileManagementService');
const rosService = require('./file_process/RosService');
const MediaResource = require('../models/MediaResource');

class ImageStreamService {
  
  async * processImageStream({ message, images, user }) {
    try {      
      yield* this.generateImageContent(message, images, user);
      
    } catch (error) {
      console.error('图片流处理服务错误:', error);
      throw error;
    }
  }
 

  /**
   * 按照官方样板代码生成图片内容
   * @async
   * @generator
   * @param {string} message - 用户输入的消息文本
   * @param {Array<Object>} images - 图片对象数组
   * @param {Object} user - 用户对象
   * @yields {Object} 流式响应对象
   * @throws {Error} 当图片生成过程中出现错误时抛出
   */
  async * generateImageContent(message, images, user) {
    const tempFiles = images.map(image => image.path);
    
    // 初始化token计数和响应文本
    const tokenStats = {
      promptTokenCount: 0,
      totalTokenCount: 0,
      promptTokensDetails: {},
      candidatesTokenCount: 0,
      estimatedTokenCount: 0
    };
    
    let fullTextResponse = '';
    let fileIndex = 0;
    
    try {
      const response = GeminiImageService.generateImageFromImage(message, tempFiles);
      
      for await (const chunk of response) {
        // 更新token统计信息
        this._updateTokenStats(chunk, tokenStats);
        if (chunk.text) {
          const textResponse = this._processTextChunk(chunk.text, tokenStats);
          fullTextResponse += textResponse.content;
          yield textResponse;
        }
        
        // 处理图片内容
        if (chunk?.candidates?.length > 0) {
          for (const candidate of chunk.candidates) {
            if (candidate?.content?.parts?.[0]?.inlineData) {
              const imageResponse = await this._processImageCandidate(
                candidate.content.parts[0].inlineData,
                fileIndex++,
                user,
                tokenStats
              );
              
              if (imageResponse) {
                fullTextResponse += imageResponse.content;
                yield imageResponse;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('图片生成错误:', error);
      throw error;
    } finally {
      // 清理临时文件
      await this._cleanupTempFiles(tempFiles);
      
      // 发送最终使用统计
      yield this._createFinalUsageResponse(fullTextResponse, tokenStats);
    }
  }
  
  /**
   * 更新token统计信息
   * @private
   */
  _updateTokenStats(chunk, tokenStats) {
    const { usageMetadata } = chunk;
    if (!usageMetadata) return;
    
    const {
      candidatesTokenCount,
      promptTokenCount,
      promptTokensDetails,
      totalTokenCount
    } = usageMetadata;
    
    if (promptTokenCount) tokenStats.promptTokenCount = promptTokenCount;
    if (totalTokenCount) tokenStats.totalTokenCount = totalTokenCount;
    if (promptTokensDetails) tokenStats.promptTokensDetails = promptTokensDetails;
    if (candidatesTokenCount) tokenStats.candidatesTokenCount = candidatesTokenCount;
  }
  
  /**
   * 处理图片候选项
   * @private
   */
  async _processImageCandidate(inlineData, fileIndex, user, tokenStats) {
    try {
      const fileExtension = GeminiImageService.getExtByMimeType(inlineData.mimeType || 'image/png');
      const buffer = Buffer.from(inlineData.data || '', 'base64');
      
      const fileName = `ai-generated-${Date.now()}-${fileIndex}`;
      const fullFileName = `${fileName}.${fileExtension}`;
      const imageKey = rosService.generateImageKey(fullFileName, 'ai-generated', user?.id);
      
      // 上传到ROS
      const uploadResult = await rosService.uploadBuffer(buffer, imageKey, {
        contentType: inlineData.mimeType || 'image/png'
      });
      
      // 保存媒体资源记录
      const mediaResource = await MediaResource.create({
        userId: user?.id,
        fileName: fullFileName,
        originalName: fullFileName,
        fileSize: uploadResult.size,
        mimeType: inlineData.mimeType || 'image/png',
        storageType: 'ros',
        storageKey: uploadResult.key,
        storageUrl: uploadResult.url,
        source: 'ai_generated'
      });
      
      // 生成Markdown链接
      const markdownLink = `\n\n![AI生成图片](${uploadResult.url})\n\n`;
      const estimatedChunkTokens = TokenManager.estimateImageTokens(buffer);
      tokenStats.estimatedTokenCount += estimatedChunkTokens;
      
      return {
        type: 'text',
        content: markdownLink,
        tokenUsed: {
          estimatedChunkTokens,
          promptTokenCount: tokenStats.promptTokenCount,
          totalTokenCount: tokenStats.totalTokenCount,
          candidatesTokenCount: tokenStats.candidatesTokenCount,
        },
        metadata: { 
          mediaResourceId: mediaResource.id
        }
      };
    } catch (error) {
      console.error('处理图片候选项失败:', error);
      return null;
    }
  }
  
  /**
   * 处理文本块
   * @private
   */
  _processTextChunk(text, tokenStats) {
    const estimatedChunkTokens = TokenManager.estimateTextTokens(text);
    tokenStats.estimatedTokenCount += estimatedChunkTokens;
    
    return {
      type: 'text',
      content: text,
      tokenUsed: {
        estimatedChunkTokens,
        promptTokenCount: tokenStats.promptTokenCount,
        totalTokenCount: tokenStats.totalTokenCount,
        candidatesTokenCount: tokenStats.candidatesTokenCount,
      },
      metadata: {}
    };
  }
  
  /**
   * 创建最终使用统计响应
   * @private
   */
  _createFinalUsageResponse(fullTextResponse, tokenStats) {
    return {
      type: 'usage_final',
      content: fullTextResponse || '',
      tokenUsed: {
        estimatedTokenCount: tokenStats.estimatedTokenCount,
        promptTokenCount: tokenStats.promptTokenCount,
        totalTokenCount: tokenStats.totalTokenCount,
        promptTokensDetails: tokenStats.promptTokensDetails,
        candidatesTokenCount: tokenStats.candidatesTokenCount,
      },
      metadata: {}
    };
  }
  
  /**
   * 清理临时文件
   * @private
   */
  async _cleanupTempFiles(tempFiles) {
    try {
      await Promise.all(
        tempFiles.map(tempFile => fileManagementService.cleanupTempFile(tempFile))
      );
    } catch (error) {
      console.error('清理临时文件失败:', error);
    }
  }
}

module.exports = new ImageStreamService();
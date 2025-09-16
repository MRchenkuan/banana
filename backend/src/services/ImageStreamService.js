const GeminiImageService = require('./gemini/GeminiImageService');
const TokenManager = require('../utils/tokenManager');
const fileManagementService = require('./file_process/FileManagementService');
const rosService = require('./file_process/RosService');
const MediaResource = require('../models/MediaResource');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

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
   * 处理文本chunk
   * @private
   */
  _processTextChunk(chunk, tokenProcessor) {
    if (chunk.text) {
      tokenProcessor.addOutputText(chunk.text);
      return {
        type: 'text',
        content: chunk.text,
        tokenUsed: tokenProcessor.getCurrentStats(),
      };
    }
    return null;
  }

  /**
   * 处理图片chunk
   * @private
   */
  async _processImageChunk(chunk, tokenProcessor, user) {
    const results = [];
    
    if (chunk?.candidates?.length > 0) {
      for (const candidate of chunk.candidates) {
        if (candidate?.content?.parts?.[0]?.inlineData) {
          const imageBuffer = Buffer.from(candidate.content.parts[0].inlineData.data || '', 'base64');
          const mimeType = candidate.content.parts[0].inlineData.mimeType;
          
          await tokenProcessor.addOutputImage(imageBuffer);
          const imageResponse = await this._processImageCandidate(imageBuffer, mimeType, user, tokenProcessor);
          
          if (imageResponse) {
            results.push(imageResponse);
          }
        }
      }
    }
    
    return results;
  }

  /**
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
    const tokenProcessor = this._createTokenProcessor(message, images);
    
    let fullTextResponse = '';
    
    try {
      const response = GeminiImageService.generateImageFromImage(message, tempFiles);
      

      for await (const chunk of response) {
        
        tokenProcessor.updateActual(chunk.usageMetadata);
        
        // 处理文本内容
        const textResult = this._processTextChunk(chunk, tokenProcessor);
        if (textResult) {
          fullTextResponse += textResult.content;
          yield textResult;
        }
        
        // 处理图片内容
        const imageResults = await this._processImageChunk(chunk, tokenProcessor, user);
        for (const imageResult of imageResults) {
          fullTextResponse += imageResult.content;
          yield imageResult;
        }
      }

    } catch (error) {
      console.error('图片生成错误:', error);
      throw error;
    } finally {
      await this._cleanupTempFiles(tempFiles);
      yield {
        type: 'usage_final',
        content: fullTextResponse,
        tokenUsed: tokenProcessor.getFinalStats(),
      }
    }
  }
  
  /**
   * 处理图片候选项
   * @private
   */
  async _processImageCandidate(buffer, mimeType, user, tokenProcessor) {
    try {
      const fileExtension = GeminiImageService.getExtByMimeType(mimeType || 'image/png');
      
      const fileName = `ai-generated-${user?.id}-${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      const fullFileName = `${fileName}.${fileExtension}`;
      const imageKey = rosService.generateImageKey(fullFileName, 'ai-generated', user?.id);
      
      // 上传到ROS
      const uploadResult = await rosService.uploadBuffer(buffer, imageKey, {
        contentType: mimeType || 'image/png'
      });
      
      // 保存媒体资源记录
      const mediaResource = await MediaResource.create({
        userId: user?.id,
        fileName: fullFileName,
        originalName: fullFileName,
        fileSize: uploadResult.size,
        mimeType: mimeType || 'image/png',
        storageType: 'ros',
        storageKey: uploadResult.key,
        storageUrl: uploadResult.url,
        source: 'ai_generated'
      });
      
      // 生成Markdown链接
      const markdownLink = `\n\n![AI生成图片](${uploadResult.url})\n\n`;
      
      return {
        type: 'text',
        content: markdownLink,
        tokenUsed: tokenProcessor.getCurrentStats(), // 修复：使用传入的tokenProcessor
        metadata: { 
          mediaResourceId: mediaResource.id,
          uniqueId: uuidv4() // 添加唯一标识
        },
      };
    } catch (error) {
      console.error('处理图片候选项失败:', error);
      return null;
    }
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


    /**
   * Token统计处理器
   * @private
   */
  _createTokenProcessor(message, images) {
    const tokenStats = TokenManager.createStatsManager();

    const processor = {
      tokenStats,
      estimateInput: async() => {
        // 预估输入文本token
        tokenStats.addEstimatedInputText(message);
        // 预估输入图片token
        for (let i = 0; i < images.length; i++) {
          // 读取图片文件为buffer
          const imageBuffer = fs.readFileSync(images[i].path);
          await tokenStats.addEstimatedInputImage(imageBuffer);
        }
      },
      updateActual(tokenUsed) {
        tokenStats.updateActualTokens(tokenUsed);
      },
      addOutputText(text) {
        tokenStats.addEstimatedOutputText(text);
      },
      async addOutputImage(buffer) {
        await tokenStats.addEstimatedOutputImage(buffer);
      },
      getCurrentStats() {
        return tokenStats.getCurrentStats();
      },
      getFinalStats() {
        return tokenStats.getCurrentStats();
      }
    };

    processor.estimateInput();
    
    return processor
  }
}

module.exports = new ImageStreamService();
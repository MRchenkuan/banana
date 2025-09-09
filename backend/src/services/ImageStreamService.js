const fs = require('fs');
const path = require('path');
const GeminiImageService = require('./gemini/GeminiImageService');
const TokenManager = require('../utils/tokenManager');
const ChatValidation = require('../utils/chatValidation');
const fileManagementService = require('./file_process/FileManagementService');
const rosService = require('./file_process/RosService');

class ImageStreamService {
  
  async * processImageStream({ message, images, sessionId, user }) {
    try {
      // 1. 先保存用户图片并生成Markdown
      const userImageMarkdown = await this.saveUserImages(images, user);
      
      // 2. 将用户消息和图片Markdown合并
      const fullUserMessage = message + (userImageMarkdown ? '\n\n' + userImageMarkdown : '');
      
      // 3. 继续原有的AI处理流程
      for await (const chunk of this.generateImageContent(fullUserMessage, images, user)) {
        yield chunk;
      }
      
    } catch (error) {
      console.error('图片流处理服务错误:', error);
      throw error;
    }
  }

  // 新增方法：保存用户图片
  async saveUserImages(images, user) {
    if (!images || images.length === 0) {
      return '';
    }
    
    const markdownLinks = [];
    
    for (const image of images) {
      try {
        const fs = require('fs');
        
        // 读取图片文件
        const buffer = fs.readFileSync(image.path);
        
        // 生成文件名和ROS key
        const fileName = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${image.originalname}`;
        const imageKey = rosService.generateImageKey(fileName, 'user-upload', user?.id);
        
        // 上传到ROS
        const uploadResult = await rosService.uploadBuffer(buffer, imageKey, {
          contentType: image.mimetype
        });
        
        // 保存媒体资源记录
        const MediaResource = require('../models/MediaResource');
        await MediaResource.create({
          userId: user?.id,
          fileName: fileName,
          originalName: image.originalname,
          fileSize: uploadResult.size || buffer.length,
          mimeType: image.mimetype,
          storageType: 'ros',
          storageKey: uploadResult.key,
          storageUrl: uploadResult.url,
          source: 'user_upload'
        });
        
        // 生成Markdown链接
        markdownLinks.push(`![${image.originalname}](${uploadResult.url})`);
        
        console.log(`用户图片已保存: ${fileName} -> ${uploadResult.url}`);
        
      } catch (error) {
        console.error('保存用户图片失败:', error);
        markdownLinks.push(`[图片上传失败: ${image.originalname}]`);
      }
    }
    
    return markdownLinks.join('\n');
  }

  /**
   * 按照官方样板代码生成图片内容
   */
  async * generateImageContent(message, images, user) {
    const tempFiles = images.map(image => image.path);
    
    try {
      const response = await GeminiImageService.generateImageFromImage(message, tempFiles, { user });
      
      await Promise.all(
        tempFiles.map(tempFile => fileManagementService.cleanupTempFile(tempFile))
      );
      
      let fileIndex = 0;
      let totalTokensUsed = 0;
      let fullTextResponse = '';
      
      for await (const chunk of response) {
        if (!chunk?.candidates?.[0]?.content?.parts?.[0]) {
          continue;
        }
        
        // 处理图片数据
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          try {
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            const fileExtension = GeminiImageService.getExtByMimeType(inlineData.mimeType || 'image/png');
            const buffer = Buffer.from(inlineData.data || '', 'base64');
            
            const fileName = `ai-generated-${Date.now()}-${fileIndex++}`;
            const fullFileName = `${fileName}.${fileExtension}`;
            const imageKey = rosService.generateImageKey(fullFileName, 'ai-generated', user?.id);
            
            // 上传到ROS
            const uploadResult = await rosService.uploadBuffer(buffer, imageKey, {
              contentType: inlineData.mimeType || 'image/png'
            });
            
            // 保存媒体资源记录
            const MediaResource = require('../models/MediaResource');
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
            
            // 生成Markdown链接并作为文本内容返回
            const markdownLink = `![AI生成图片](${uploadResult.url})`;
            const estimatedTokens = 1;
            totalTokensUsed += estimatedTokens;
            fullTextResponse += markdownLink;
            
            yield {
              type: 'text',
              content: markdownLink,
              tokens: estimatedTokens,
              metadata: { 
                estimatedTokens,
                totalTokensUsed,
                fullTextResponse,
                mediaResourceId: mediaResource.id
              }
            };
            
          } catch (uploadError) {
            console.error('ROS上传失败:', uploadError);
          }
        } else {
          // 处理文本内容
          if (chunk.text) {
            const estimatedTokens = TokenManager.estimateTokens(chunk.text);
            totalTokensUsed += estimatedTokens;
            fullTextResponse += chunk.text;
            
            yield {
              type: 'text',
              content: chunk.text,
              tokens: estimatedTokens,
              metadata: { 
                estimatedTokens,
                totalTokensUsed,
                fullTextResponse
              }
            };
          }
        }
      }
      
    } catch (error) {
      console.error('图片生成错误:', error);
      await Promise.all(
        tempFiles.map(tempFile => fileManagementService.cleanupTempFile(tempFile))
      );
      throw error;
    }
  }
}

module.exports = new ImageStreamService();
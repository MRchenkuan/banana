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
      yield* this.generateImageContent(message, images, user);
      
    } catch (error) {
      console.error('图片流处理服务错误:', error);
      throw error;
    }
  }
 

  /**
   * 按照官方样板代码生成图片内容
   */
  async * generateImageContent(message, images, user) {
    const tempFiles = images.map(image => image.path);
    
    try {
      const response = GeminiImageService.generateImageFromImage(message, tempFiles, { user });
      
      // await Promise.all(
      //   tempFiles.map(tempFile => fileManagementService.cleanupTempFile(tempFile))
      // );
      
      let fileIndex = 0;
      let totalTokensUsed = 0;
      let fullTextResponse = '';
      
      for await (const chunk of response) {
        const { text, usageMetadata } = chunk;
        const {
          candidatesTokenCount,
          promptTokenCount,
          promptTokensDetails,
          totalTokenCount
        } = usageMetadata || {}
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
            const markdownLink = `\n\n![AI生成图片](${uploadResult.url})\n\n`;
            const estimatedTokens = 1;
            totalTokensUsed += estimatedTokens;
            fullTextResponse += markdownLink;
            
            yield {
              type: 'text',
              content: markdownLink,
              tokens: estimatedTokens,
              metadata: { 
                estimatedTokens,
                totalTokensUsed: usageMetadata,
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
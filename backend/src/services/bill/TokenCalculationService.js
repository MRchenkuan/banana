const BILLING_CONFIG = require('../../config/billingConfig');
const sharp = require('sharp'); // 用于图片信息获取
const fs = require('fs').promises;

class TokenCalculationService {
  /**
   * 计算文本处理所需的tokens
   * @param {string} text - 输入文本
   * @param {string} type - 处理类型 ('basic' | 'advanced')
   * @param {Object} options - 额外选项
   * @returns {Object} 计算结果
   */
  static calculateTextTokens(text, type = 'basic', options = {}) {
    if (!text || typeof text !== 'string') {
      return {
        tokens: 0,
        details: { error: '无效的文本输入' }
      };
    }

    const config = BILLING_CONFIG.text[type] || BILLING_CONFIG.text.basic;
    const charCount = text.length;
    const kCharCount = charCount / 1000;
    
    // 基础计算：字符数 * 每千字符token消耗
    let baseTokens = Math.ceil(kCharCount * config.tokensPerKChar);
    
    // 应用最小值和最大值限制
    baseTokens = Math.max(baseTokens, config.minTokens);
    baseTokens = Math.min(baseTokens, config.maxTokens);
    
    // 计算上下文窗口额外消耗
    let contextTokens = 0;
    if (options.contextLength) {
      const contextKTokens = options.contextLength / 1000;
      contextTokens = Math.ceil(contextKTokens * BILLING_CONFIG.special.contextWindow.perKTokensInContext);
    }
    
    const totalTokens = baseTokens + contextTokens;
    
    return {
      tokens: totalTokens,
      details: {
        baseTokens,
        contextTokens,
        charCount,
        type,
        breakdown: {
          textProcessing: baseTokens,
          contextWindow: contextTokens
        }
      }
    };
  }

  /**
   * 计算图片处理所需的tokens
   * @param {string} imagePath - 图片路径或Buffer
   * @param {string} operation - 操作类型 ('analysis' | 'generation' | 'editing')
   * @param {Object} options - 额外选项
   * @returns {Promise<Object>} 计算结果
   */
  static async calculateImageTokens(imagePath, operation = 'analysis', options = {}) {
    try {
      const config = BILLING_CONFIG.image[operation];
      if (!config) {
        throw new Error(`不支持的图片操作类型: ${operation}`);
      }

      let baseTokens = config.baseTokens;
      let additionalTokens = 0;
      let imageInfo = {};

      if (operation === 'analysis' && imagePath) {
        // 获取图片信息
        imageInfo = await this._getImageInfo(imagePath);
        const sizeInMB = imageInfo.size / (1024 * 1024);
        additionalTokens = Math.ceil(sizeInMB * config.perMBTokens);
      } else if (operation === 'generation') {
        // 图片生成计费
        const quality = options.quality || 'medium';
        const size = options.size || '1024x1024';
        
        const qualityMultiplier = config.qualityMultiplier[quality] || 1.0;
        const sizeMultiplier = config.sizeMultiplier[size] || 1.0;
        
        baseTokens = Math.ceil(baseTokens * qualityMultiplier * sizeMultiplier);
      } else if (operation === 'editing') {
        // 图片编辑计费
        const operationCount = options.operationCount || 1;
        additionalTokens = operationCount * config.perOperationTokens;
      }

      const totalTokens = Math.min(baseTokens + additionalTokens, config.maxTokens || 10000);

      return {
        tokens: totalTokens,
        details: {
          baseTokens,
          additionalTokens,
          operation,
          imageInfo,
          options,
          breakdown: {
            base: baseTokens,
            additional: additionalTokens
          }
        }
      };
    } catch (error) {
      console.error('图片token计算错误:', error);
      return {
        tokens: BILLING_CONFIG.image.analysis.baseTokens, // 默认值
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算文件上传处理所需的tokens
   * @param {number} fileSizeBytes - 文件大小（字节）
   * @param {string} fileType - 文件类型
   * @returns {Object} 计算结果
   */
  static calculateFileUploadTokens(fileSizeBytes, fileType = 'unknown') {
    const config = BILLING_CONFIG.special.fileUpload;
    const sizeInMB = fileSizeBytes / (1024 * 1024);
    
    let tokens = Math.ceil(sizeInMB * config.perMBTokens);
    tokens = Math.min(tokens, config.maxTokens);
    
    return {
      tokens,
      details: {
        fileSizeBytes,
        fileSizeMB: sizeInMB,
        fileType,
        breakdown: {
          fileProcessing: tokens
        }
      }
    };
  }

  /**
   * 应用用户等级折扣
   * @param {number} baseTokens - 基础token消耗
   * @param {string} userTier - 用户等级
   * @param {Object} options - 额外选项
   * @returns {Object} 折扣后的结果
   */
  static applyUserTierDiscount(baseTokens, userTier = 'free', options = {}) {
    const tierConfig = BILLING_CONFIG.userTiers[userTier] || BILLING_CONFIG.userTiers.free;
    let finalTokens = baseTokens;
    let discountApplied = 0;
    
    // 应用等级折扣
    if (tierConfig.discount > 0) {
      discountApplied += tierConfig.discount;
      finalTokens = Math.ceil(baseTokens * (1 - tierConfig.discount));
    }
    
    // 应用批量折扣
    if (options.batchCount && options.batchCount >= BILLING_CONFIG.batchDiscount.threshold) {
      discountApplied += BILLING_CONFIG.batchDiscount.discount;
      finalTokens = Math.ceil(finalTokens * (1 - BILLING_CONFIG.batchDiscount.discount));
    }
    
    return {
      originalTokens: baseTokens,
      finalTokens,
      discountApplied,
      userTier,
      savings: baseTokens - finalTokens
    };
  }

  /**
   * 检查用户是否超出使用限额
   * @param {Object} user - 用户对象
   * @param {number} requestedTokens - 请求的token数量
   * @returns {Promise<Object>} 检查结果
   */
  static async checkUsageLimits(user, requestedTokens) {
    const tierConfig = BILLING_CONFIG.userTiers[user.tier || 'free'];
    
    // 检查余额
    if (user.tokenBalance < requestedTokens) {
      return {
        allowed: false,
        reason: 'insufficient_balance',
        message: 'Token余额不足2',
        required: requestedTokens,
        available: user.tokenBalance
      };
    }
    
    // 检查日限额（如果有限制）
    if (tierConfig.dailyLimit > 0) {
      const todayUsage = await this._getTodayUsage(user.id);
      if (todayUsage + requestedTokens > tierConfig.dailyLimit) {
        return {
          allowed: false,
          reason: 'daily_limit_exceeded',
          message: '超出每日使用限额',
          dailyLimit: tierConfig.dailyLimit,
          todayUsage,
          requested: requestedTokens
        };
      }
    }
    
    // 检查月限额（如果有限制）
    if (tierConfig.monthlyLimit > 0) {
      const monthUsage = await this._getMonthUsage(user.id);
      if (monthUsage + requestedTokens > tierConfig.monthlyLimit) {
        return {
          allowed: false,
          reason: 'monthly_limit_exceeded',
          message: '超出每月使用限额',
          monthlyLimit: tierConfig.monthlyLimit,
          monthUsage,
          requested: requestedTokens
        };
      }
    }
    
    return {
      allowed: true,
      message: '使用限额检查通过'
    };
  }

  // ========== 私有方法 ==========
  
  /**
   * 获取图片信息
   * @private
   */
  static async _getImageInfo(imagePath) {
    try {
      let imageBuffer;
      
      if (Buffer.isBuffer(imagePath)) {
        imageBuffer = imagePath;
      } else {
        const stats = await fs.stat(imagePath);
        imageBuffer = await fs.readFile(imagePath);
        
        return {
          size: stats.size,
          path: imagePath,
          ...(await sharp(imageBuffer).metadata())
        };
      }
      
      return {
        size: imageBuffer.length,
        ...(await sharp(imageBuffer).metadata())
      };
    } catch (error) {
      console.error('获取图片信息失败:', error);
      return {
        size: 0,
        width: 0,
        height: 0,
        format: 'unknown'
      };
    }
  }
  
  /**
   * 获取用户今日使用量
   * @private
   */
  static async _getTodayUsage(userId) {
    const { TokenUsage } = require('../../models');
    const { Op } = require('sequelize');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usage = await TokenUsage.sum('tokensUsed', {
      where: {
        userId,
        createdAt: {
          [Op.gte]: today
        }
      }
    });
    
    return usage || 0;
  }
  
  /**
   * 获取用户本月使用量
   * @private
   */
  static async _getMonthUsage(userId) {
    const { TokenUsage } = require('../../models');
    const { Op } = require('sequelize');
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const usage = await TokenUsage.sum('tokensUsed', {
      where: {
        userId,
        createdAt: {
          [Op.gte]: thisMonth
        }
      }
    });
    
    return usage || 0;
  }
}

module.exports = TokenCalculationService;
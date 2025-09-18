const { User, TokenUsage } = require('../models');
const sharp = require('sharp'); // 添加 sharp 库导入

/**
 * Token 统计管理器
 * 负责管理预估和实际的 token 统计数据
 */
class TokenStats {
  constructor() {
    this.stats = {
      estimated: {
        input: {
          total: 0,
          detail: []
        },
        output: {
          total: 0,
          detail: []
        },
      },
      // 实际统计（服务返回）
      actual: {
        input: {
          total: 0,
          detail: []
        },
        output: {
          total: 0,
          detail: []
        },
        total: 0
      },
      // 累计统计
      cumulative: {
        chunks: 0,
        requests: 0
      },
      // 添加失败标记
    };
  }

  /**
   * 添加预估的输入文本 token
   */
  addEstimatedInputText(text) {
    const count = TokenManager.estimateTextTokens(text);
    this.stats.estimated.input.total += count;
    this.stats.estimated.input.detail.push({
      type: 'text',
      count: count,
    });
  }

  /**
   * 添加预估的输出文本 token
   */
  addEstimatedOutputText(text) {
    const count = TokenManager.estimateTextTokens(text);
    this.stats.estimated.output.total += count;
    this.stats.estimated.output.detail.push({
      type: 'text',
      count: count,
    });
    
    this.stats.cumulative.chunks++;
  }

  /**
   * 添加预估的输入文件 token（接受 buffer）
   */
  async addEstimatedInputImage(buffer) {
    const count = await TokenManager.estimateImageTokens(buffer);
    this.stats.estimated.input.total += count;
    this.stats.estimated.input.detail.push({
      type: 'image',
      count: count,
      fileSize: buffer.length,
    });    
  }

  /**
   * 添加预估的输出文件 token（接受 buffer）
   */
  async addEstimatedOutputImage(buffer) {
    const count = await TokenManager.estimateImageTokens(buffer);
    this.stats.estimated.output.total += count;
    this.stats.estimated.output.detail.push({
      type: 'image',
      count: count,
      fileSize: buffer.length,
    });    
    this.stats.cumulative.chunks++;
  }


  /**
   * ============================== 更新实际的 token 统计（从服务响应）
   */
  updateActualTokens(usageMetadata) {
    if (!usageMetadata) {
      this.stats.cumulative.requests++;
      return;
    }

    try {
      const {
        promptTokenCount,
        promptTokensDetails,
        candidatesTokenCount,
        candidatesTokensDetails,
        totalTokenCount
      } = usageMetadata;

      // 更新实际输入数据
      this.stats.actual.input.total = promptTokenCount || 0;
      this.stats.actual.input.detail = (promptTokensDetails || []).map(item => ({
        type: item.modality,
        count: item.tokenCount,
      }));

      // 更新实际输出数据
      this.stats.actual.output.total = candidatesTokenCount || 0;
      this.stats.actual.output.detail = (candidatesTokensDetails || []).map(item => ({
        type: item.modality,
        count: item.tokenCount,
      }));
      
      // 更新实际总 token
      this.stats.actual.total = totalTokenCount || 0;
            
    } catch (error) {
      // 解析失败时设置标记
      console.warn('Failed to parse usageMetadata:', error);
    }
    
    this.stats.cumulative.requests++;
  }

  /**
   * 获取当前统计数据（用于流式响应）
   */
  getCurrentStats() {
    const estimateInput = this.stats.estimated.input.total;
    const estimateOutput = this.stats.estimated.output.total;
    const estimateTotal = estimateInput + estimateOutput;

    const actualInput = this.stats.actual.input.total;
    const actualOutput = this.stats.actual.output.total;
    const actualTotal = this.stats.actual.total;
    return {
      estimated: {
        input: estimateInput,
        output: estimateOutput,
        total: estimateTotal,
      },
      actual: {
        input: actualInput,
        output: actualOutput,
        total: actualTotal,
      },
      cumulative: this.stats.cumulative
    };
  }
}

class TokenManager {
  /**
   * 创建新的 token 统计管理器
   */
  static createStatsManager() {
    return new TokenStats();
  }

  static async getUserBalance(userId) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    return { user, balance: user.tokenBalance };
  }
  
  static estimateTokens(text) {
    return Math.ceil(text.length * 0.75);
  }
  
  static estimateTextTokens(text) {
    return Math.ceil(text.length * 0.75) || 0;
  }
  
  static async checkBalance(user, estimatedTokens) {
    // 移除余额检查，允许余额为负
    if (user.tokenBalance < estimatedTokens) {
      return {pass: false, balance: user.tokenBalance};
    }
    return {pass: true, balance: user.tokenBalance};
  }
  
  static async deductTokens(user, tokensUsed) {
    return await user.deductTokens(tokensUsed);
  }
  
  static async recordTokenUsage({
    userId,
    chatMessageId,
    tokensUsed,
    operation,
    balanceBefore,
    balanceAfter
  }) {
    return await TokenUsage.create({
      userId,
      chatMessageId,
      tokensUsed,
      operation,
      balanceBefore,
      balanceAfter
    });
  }
  
  /**
   * 根据 Gemini 规则预估图像处理所需的 tokens
   * @param {Object|Buffer|string} imageInfo - 图像信息对象、Buffer 或文件路径
   * @param {number} imageInfo.width - 图像宽度（像素）
   * @param {number} imageInfo.height - 图像高度（像素）
   * @returns {Promise<number>|number} 预估的 token 数量
   */
  static async estimateImageTokens(imageInfo) {
    // 如果传入的是 Buffer，使用 sharp 获取图片信息
    if (Buffer.isBuffer(imageInfo)) {
      try {
        const metadata = await sharp(imageInfo).metadata();
        return this._calculateTokensByDimensions(metadata.width, metadata.height);
      } catch (error) {
        console.error('从 Buffer 获取图片信息失败:', error);
        return 758; // 返回默认值
      }
    }
    
    // 如果传入的是文件路径字符串
    if (typeof imageInfo === 'string') {
      try {
        const metadata = await sharp(imageInfo).metadata();
        return this._calculateTokensByDimensions(metadata.width, metadata.height);
      } catch (error) {
        console.error('从文件路径获取图片信息失败:', error);
        return 758; // 返回默认值
      }
    }
    
    // 如果传入的是包含 width 和 height 的对象
    if (imageInfo && typeof imageInfo === 'object' && imageInfo.width && imageInfo.height) {
      return this._calculateTokensByDimensions(imageInfo.width, imageInfo.height);
    }
    
    // 如果没有提供有效的图像信息，返回默认值
    return 758; // Gemini 默认图像 token 数
  }
  
  /**
   * 根据图片尺寸计算 tokens
   * @private
   * @param {number} width - 图片宽度
   * @param {number} height - 图片高度
   * @returns {number} token 数量
   */
  static _calculateTokensByDimensions(width, height) {
    if (!width || !height) {
      return 258;
    }
    
    // 根据 Gemini 2.0 规则计算图像 token
    // 如果图像尺寸小于等于 384x384，消耗 258 tokens
    // 否则，按 768x768 的瓦片计算，每个瓦片 258 tokens
    if (width <= 384 && height <= 384) {
      return 258;
    } else {
      // 计算需要多少个 768x768 的瓦片
      const tilesWidth = Math.ceil(width / 768);
      const tilesHeight = Math.ceil(height / 768);
      return tilesWidth * tilesHeight * 258;
    }
  }
  
  /**
   * 根据 Gemini 规则预估视频处理所需的 tokens
   * @param {number} durationSeconds - 视频时长（秒）
   * @returns {number} 预估的 token 数量
   */
  static estimateVideoTokens(durationSeconds) {
    // Gemini 视频处理规则：每秒 263 tokens
    return Math.ceil(durationSeconds * 263);
  }
  
  /**
   * 根据 Gemini 规则预估音频处理所需的 tokens
   * @param {number} durationSeconds - 音频时长（秒）
   * @returns {number} 预估的 token 数量
   */
  static estimateAudioTokens(durationSeconds) {
    // Gemini 音频处理规则：每秒 32 tokens
    return Math.ceil(durationSeconds * 32);
  }
}

module.exports = TokenManager;
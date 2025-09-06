const TokenCalculationService = require('./TokenCalculationService');
const { User, TokenUsage, ChatMessage } = require('../../models');
const { sequelize } = require('../../config/database');

class BillingService {
  /**
   * 处理文本聊天计费
   * @param {Object} params - 计费参数
   * @returns {Promise<Object>} 计费结果
   */
  static async processTextChatBilling(params) {
    const {
      userId,
      chatMessageId,
      userMessage,
      aiResponse,
      contextLength = 0,
      messageType = 'basic'
    } = params;

    const transaction = await sequelize.transaction();
    
    try {
      // 获取用户信息
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('用户不存在');
      }

      // 计算输入文本tokens
      const inputCalculation = TokenCalculationService.calculateTextTokens(
        userMessage, 
        messageType, 
        { contextLength }
      );

      // 计算输出文本tokens
      const outputCalculation = TokenCalculationService.calculateTextTokens(
        aiResponse, 
        messageType
      );

      const totalBaseTokens = inputCalculation.tokens + outputCalculation.tokens;

      // 应用用户等级折扣
      const discountResult = TokenCalculationService.applyUserTierDiscount(
        totalBaseTokens,
        user.tier || 'free'
      );

      // 检查使用限额
      const limitCheck = await TokenCalculationService.checkUsageLimits(
        user, 
        discountResult.finalTokens
      );

      if (!limitCheck.allowed) {
        await transaction.rollback();
        return {
          success: false,
          error: limitCheck.reason,
          message: limitCheck.message,
          details: limitCheck
        };
      }

      // 扣除tokens
      const balanceBefore = user.tokenBalance;
      await user.update({
        tokenBalance: balanceBefore - discountResult.finalTokens
      }, { transaction });

      // 记录token使用
      const tokenUsage = await TokenUsage.create({
        userId,
        chatMessageId,
        tokensUsed: discountResult.finalTokens,
        operation: 'chat',
        balanceBefore,
        balanceAfter: balanceBefore - discountResult.finalTokens,
        // 扩展字段（需要先更新模型）
        operationType: 'text_chat',
        inputTokens: inputCalculation.tokens,
        outputTokens: outputCalculation.tokens,
        discountApplied: discountResult.discountApplied,
        userTier: user.tier || 'free',
        calculationDetails: JSON.stringify({
          input: inputCalculation.details,
          output: outputCalculation.details,
          discount: discountResult
        })
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        tokensUsed: discountResult.finalTokens,
        balanceAfter: balanceBefore - discountResult.finalTokens,
        savings: discountResult.savings,
        details: {
          inputTokens: inputCalculation.tokens,
          outputTokens: outputCalculation.tokens,
          totalBaseTokens,
          finalTokens: discountResult.finalTokens,
          discountApplied: discountResult.discountApplied,
          tokenUsageId: tokenUsage.id
        }
      };
    } catch (error) {
      await transaction.rollback();
      console.error('文本聊天计费错误:', error);
      throw error;
    }
  }

  /**
   * 处理图片相关计费
   * @param {Object} params - 计费参数
   * @returns {Promise<Object>} 计费结果
   */
  static async processImageBilling(params) {
    const {
      userId,
      chatMessageId,
      imagePath,
      operation = 'analysis', // 'analysis' | 'generation' | 'editing'
      userMessage = '',
      aiResponse = '',
      options = {}
    } = params;

    const transaction = await sequelize.transaction();
    
    try {
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('用户不存在');
      }

      // 计算图片处理tokens
      const imageCalculation = await TokenCalculationService.calculateImageTokens(
        imagePath,
        operation,
        options
      );

      // 计算文本tokens（如果有）
      let textTokens = 0;
      if (userMessage) {
        const textCalculation = TokenCalculationService.calculateTextTokens(userMessage, 'basic');
        textTokens += textCalculation.tokens;
      }
      if (aiResponse) {
        const responseCalculation = TokenCalculationService.calculateTextTokens(aiResponse, 'basic');
        textTokens += responseCalculation.tokens;
      }

      const totalBaseTokens = imageCalculation.tokens + textTokens;

      // 应用折扣
      const discountResult = TokenCalculationService.applyUserTierDiscount(
        totalBaseTokens,
        user.tier || 'free'
      );

      // 检查限额
      const limitCheck = await TokenCalculationService.checkUsageLimits(
        user, 
        discountResult.finalTokens
      );

      if (!limitCheck.allowed) {
        await transaction.rollback();
        return {
          success: false,
          error: limitCheck.reason,
          message: limitCheck.message,
          details: limitCheck
        };
      }

      // 扣除tokens
      const balanceBefore = user.tokenBalance;
      await user.update({
        tokenBalance: balanceBefore - discountResult.finalTokens
      }, { transaction });

      // 记录使用
      const tokenUsage = await TokenUsage.create({
        userId,
        chatMessageId,
        tokensUsed: discountResult.finalTokens,
        operation: 'image_analysis',
        balanceBefore,
        balanceAfter: balanceBefore - discountResult.finalTokens,
        operationType: `image_${operation}`,
        inputTokens: textTokens,
        outputTokens: imageCalculation.tokens,
        discountApplied: discountResult.discountApplied,
        userTier: user.tier || 'free',
        calculationDetails: JSON.stringify({
          image: imageCalculation.details,
          text: { tokens: textTokens },
          discount: discountResult,
          operation,
          options
        })
      }, { transaction });

      await transaction.commit();

      return {
        success: true,
        tokensUsed: discountResult.finalTokens,
        balanceAfter: balanceBefore - discountResult.finalTokens,
        savings: discountResult.savings,
        details: {
          imageTokens: imageCalculation.tokens,
          textTokens,
          totalBaseTokens,
          finalTokens: discountResult.finalTokens,
          operation,
          tokenUsageId: tokenUsage.id
        }
      };
    } catch (error) {
      await transaction.rollback();
      console.error('图片计费错误:', error);
      throw error;
    }
  }

  /**
   * 获取用户计费统计
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 统计结果
   */
  static async getUserBillingStats(userId, options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 默认30天前
      endDate = new Date(),
      groupBy = 'day' // 'day' | 'week' | 'month'
    } = options;

    const { Op } = require('sequelize');
    
    try {
      // 基础统计
      const totalUsage = await TokenUsage.sum('tokensUsed', {
        where: {
          userId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        }
      });

      // 按操作类型统计
      const usageByOperation = await TokenUsage.findAll({
        attributes: [
          'operationType',
          [sequelize.fn('SUM', sequelize.col('tokensUsed')), 'totalTokens'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount'],
          [sequelize.fn('AVG', sequelize.col('tokensUsed')), 'avgTokens']
        ],
        where: {
          userId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: ['operationType'],
        raw: true
      });

      // 按时间分组统计
      let dateFormat;
      switch (groupBy) {
        case 'week':
          dateFormat = '%Y-%u'; // 年-周
          break;
        case 'month':
          dateFormat = '%Y-%m'; // 年-月
          break;
        default:
          dateFormat = '%Y-%m-%d'; // 年-月-日
      }

      const usageByTime = await TokenUsage.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), dateFormat), 'period'],
          [sequelize.fn('SUM', sequelize.col('tokensUsed')), 'totalTokens'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'operationCount']
        ],
        where: {
          userId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), dateFormat)],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('createdAt'), dateFormat), 'ASC']],
        raw: true
      });

      // 计算节省的tokens
      const totalSavings = await TokenUsage.sum('discountApplied', {
        where: {
          userId,
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        }
      }) || 0;

      return {
        period: {
          startDate,
          endDate,
          groupBy
        },
        summary: {
          totalTokensUsed: totalUsage || 0,
          totalOperations: usageByOperation.reduce((sum, item) => sum + parseInt(item.operationCount), 0),
          totalSavings,
          avgTokensPerOperation: usageByOperation.length > 0 
            ? (totalUsage / usageByOperation.reduce((sum, item) => sum + parseInt(item.operationCount), 0)).toFixed(2)
            : 0
        },
        byOperation: usageByOperation,
        byTime: usageByTime
      };
    } catch (error) {
      console.error('获取计费统计错误:', error);
      throw error;
    }
  }

  /**
   * 预估操作成本
   * @param {Object} params - 预估参数
   * @returns {Promise<Object>} 预估结果
   */
  static async estimateOperationCost(params) {
    const {
      userId,
      operationType, // 'text' | 'image_analysis' | 'image_generation'
      textLength = 0,
      imageSize = 0,
      options = {}
    } = params;

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      let estimation = { tokens: 0, details: {} };

      if (operationType === 'text') {
        estimation = TokenCalculationService.calculateTextTokens(
          'x'.repeat(textLength), // 模拟文本
          options.messageType || 'basic',
          options
        );
      } else if (operationType.startsWith('image_')) {
        const operation = operationType.replace('image_', '');
        estimation = await TokenCalculationService.calculateImageTokens(
          null, // 不需要实际图片
          operation,
          { ...options, estimatedSize: imageSize }
        );
      }

      // 应用折扣
      const discountResult = TokenCalculationService.applyUserTierDiscount(
        estimation.tokens,
        user.tier || 'free',
        options
      );

      // 检查限额
      const limitCheck = await TokenCalculationService.checkUsageLimits(
        user,
        discountResult.finalTokens
      );

      return {
        estimation: {
          baseTokens: estimation.tokens,
          finalTokens: discountResult.finalTokens,
          savings: discountResult.savings,
          canAfford: user.tokenBalance >= discountResult.finalTokens,
          balanceAfter: user.tokenBalance - discountResult.finalTokens
        },
        limits: limitCheck,
        details: {
          calculation: estimation.details,
          discount: discountResult,
          userTier: user.tier || 'free',
          currentBalance: user.tokenBalance
        }
      };
    } catch (error) {
      console.error('预估操作成本错误:', error);
      throw error;
    }
  }
}

module.exports = BillingService;
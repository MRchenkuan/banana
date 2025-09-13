const { User, TokenRecharge, sequelize } = require('../../models');

class TokenRechargeService {
  /**
   * 记录token充值
   * @param {Object} params - 充值参数
   * @param {number} params.userId - 用户ID
   * @param {number} params.tokensAdded - 增加的token数量
   * @param {string} params.source - 来源类型
   * @param {string} params.sourceId - 来源ID
   * @param {string} params.description - 描述
   * @returns {Promise<Object>} 充值结果
   */
  static async recordTokenRecharge(params) {
    const { userId, tokensAdded, source = 'payment', sourceId, description } = params;
    
    const transaction = await sequelize.transaction();
    
    try {
      // 获取用户当前token余额
      const user = await User.findByPk(userId, { transaction });
      if (!user) {
        throw new Error('用户不存在');
      }
      
      const balanceBefore = user.tokenBalance;
      const balanceAfter = balanceBefore + tokensAdded;
      
      // 创建充值记录
      const recharge = await TokenRecharge.create({
        userId,
        tokensAdded,
        balanceBefore,
        balanceAfter,
        source,
        sourceId,
        description
      }, { transaction });
      
      // 更新用户余额
      await user.update({ tokenBalance: balanceAfter }, { transaction });
      
      await transaction.commit();
      
      return {
        success: true,
        rechargeId: recharge.id,
        balanceBefore,
        balanceAfter,
        tokensAdded
      };
    } catch (error) {
      await transaction.rollback();
      console.error('记录token充值失败:', error);
      throw error;
    }
  }
  
  /**
   * 从支付订单添加tokens
   * @param {Object} order - 订单对象
   * @returns {Promise<Object>} 充值结果
   */
  static async addTokensFromPayment(order) {
    return this.recordTokenRecharge({
      userId: order.userId,
      tokensAdded: order.tokensPurchased,
      source: 'payment',
      sourceId: order.orderNo,
      description: `购买套餐: ${order.packageName}`
    });
  }
  
  /**
   * 获取用户充值历史
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @param {number} options.page - 页码
   * @param {number} options.limit - 每页数量
   * @param {string} options.source - 筛选来源类型
   * @returns {Promise<Object>} 充值历史
   */
  static async getUserRechargeHistory(userId, options = {}) {
    const { page = 1, limit = 20, source } = options;
    const offset = (page - 1) * limit;
    
    const whereCondition = { userId };
    if (source) {
      whereCondition.source = source;
    }
    
    const { count, rows } = await TokenRecharge.findAndCountAll({
      where: whereCondition,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    return {
      success: true,
      recharges: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit)
      }
    };
  }
}

module.exports = TokenRechargeService;
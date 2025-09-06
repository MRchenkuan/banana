const { sequelize, testConnection, syncDatabase } = require('../config/database');
const { User, ChatMessage, PaymentRecord, TokenUsage } = require('../models');

// 初始化数据库
const initDatabase = async () => {
  try {
    console.log('🔄 正在初始化数据库...');
    
    // 测试连接
    await testConnection();
    
    // 同步模型到数据库
    await syncDatabase();
    
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};

// 关闭数据库连接
const closeDatabase = async () => {
  try {
    await sequelize.close();
    console.log('✅ 数据库连接已关闭');
  } catch (error) {
    console.error('❌ 关闭数据库连接失败:', error);
  }
};

// 获取用户统计信息
const getUserStats = async (userId) => {
  const { Op } = require('sequelize');
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [dailyUsage, monthlyUsage, totalUsage, chatCount] = await Promise.all([
    // 今日消耗
    TokenUsage.sum('tokensUsed', {
      where: {
        userId,
        createdAt: { [Op.gte]: startOfDay }
      }
    }),
    // 本月消耗
    TokenUsage.sum('tokensUsed', {
      where: {
        userId,
        createdAt: { [Op.gte]: startOfMonth }
      }
    }),
    // 总消耗
    TokenUsage.sum('tokensUsed', {
      where: { userId }
    }),
    // 对话次数
    ChatMessage.count({
      where: { userId }
    })
  ]);
  
  return {
    dailyUsage: dailyUsage || 0,
    monthlyUsage: monthlyUsage || 0,
    totalUsage: totalUsage || 0,
    chatCount: chatCount || 0
  };
};

// 获取Token使用历史
const getTokenUsageHistory = async (userId, startDate, endDate, limit = 50) => {
  const { Op } = require('sequelize');
  
  const usage = await TokenUsage.findAll({
    where: {
      userId,
      createdAt: {
        [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
      }
    },
    include: [
      {
        model: ChatMessage,
        as: 'chatMessage',
        attributes: ['type', 'userMessage']
      }
    ],
    order: [['createdAt', 'DESC']],
    limit
  });
  
  return usage.map(item => ({
    id: item.id,
    tokensUsed: item.tokensUsed,
    operation: item.operation,
    type: item.chatMessage?.type || 'unknown',
    userMessage: item.chatMessage?.userMessage || '',
    createdAt: item.createdAt
  }));
};

module.exports = {
  sequelize,
  initDatabase,
  closeDatabase,
  getUserStats,
  getTokenUsageHistory,
  // 导出模型
  User,
  ChatMessage,
  PaymentRecord,
  TokenUsage
};
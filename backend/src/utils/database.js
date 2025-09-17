const { sequelize, testConnection, syncDatabase } = require('../config/database');
const { User, ChatMessage, TokenUsage, Order, Announcement } = require('../models');

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

// 导出
module.exports = {
  sequelize,
  initDatabase,
  closeDatabase,
  // 导出模型
  User,
  ChatMessage,
  TokenUsage,
  Order,
  Announcement
};
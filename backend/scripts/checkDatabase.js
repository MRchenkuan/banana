const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize, User, ChatMessage, PaymentRecord, TokenUsage } = require('../src/utils/database');

// 检查数据库连接和表结构
const checkDatabase = async () => {
  try {
    console.log('🔍 检查数据库状态...');
    console.log('=' .repeat(50));
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接正常');
    
    // 检查表是否存在
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📋 现有表:', tables.join(', '));
    
    // 统计各表数据量
    const userCount = await User.count();
    const chatCount = await ChatMessage.count();
    const paymentCount = await PaymentRecord.count();
    const usageCount = await TokenUsage.count();
    
    console.log('');
    console.log('📊 数据统计:');
    console.log(`   用户数量: ${userCount}`);
    console.log(`   聊天记录: ${chatCount}`);
    console.log(`   支付记录: ${paymentCount}`);
    console.log(`   使用记录: ${usageCount}`);
    
    // 显示用户列表
    if (userCount > 0) {
      console.log('');
      console.log('👥 用户列表:');
      const users = await User.findAll({
        attributes: ['id', 'username', 'email', 'tokenBalance', 'createdAt']
      });
      
      users.forEach(user => {
        console.log(`   ID: ${user.id} | ${user.username} (${user.email}) | 余额: ${user.tokenBalance} tokens | 注册时间: ${user.createdAt.toLocaleString()}`);
      });
    }
    
    console.log('=' .repeat(50));
    console.log('✅ 数据库检查完成');
    
  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

// 运行检查
checkDatabase();
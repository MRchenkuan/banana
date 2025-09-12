const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('../src/config/database');

// 更新User表的自增ID起始值为10000
const updateUserIdSequence = async () => {
  try {
    console.log('🔄 开始更新用户ID序列...');
    console.log('=' .repeat(50));
    
    // 测试连接
    await sequelize.authenticate();
    console.log('✅ 数据库连接正常');
    
    // 执行ALTER TABLE语句修改AUTO_INCREMENT值
    await sequelize.query('ALTER TABLE users AUTO_INCREMENT = 10000;');
    
    console.log('✅ 用户ID序列已更新为从10000开始');
    
    // 验证更新结果
    const [results] = await sequelize.query('SHOW TABLE STATUS LIKE "users";');
    if (results.length > 0) {
      console.log(`📊 当前users表AUTO_INCREMENT值: ${results[0].Auto_increment}`);
    }
    
    console.log('=' .repeat(50));
    console.log('✅ 操作完成');
    
  } catch (error) {
    console.error('❌ 更新用户ID序列失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    process.exit(0);
  }
};

// 运行更新
updateUserIdSequence();
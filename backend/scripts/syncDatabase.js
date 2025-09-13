const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { testConnection } = require('../src/config/database');
const { sequelize } = require('../src/config/database');

// 重要：导入所有模型定义
const models = require('../src/models');

// 数据库同步脚本（支持强制模式）
const runSync = async () => {
  try {
    // 检查是否为强制模式
    const isForce = process.argv.includes('--force') || process.argv.includes('-f');
    
    if (isForce) {
      console.log('⚠️  开始强制数据库同步...');
      console.log('⚠️  警告：此操作将删除所有现有数据！');
    } else {
      console.log('🔄 开始数据库同步...');
    }
    console.log('=' .repeat(50));
    
    // 测试连接
    await testConnection();
    
    // 显示检测到的模型
    console.log('📋 检测到的模型:');
    Object.keys(sequelize.models).forEach(modelName => {
      console.log(`   - ${modelName}`);
    });
    console.log('');
    
    // 执行同步
    if (isForce) {
      // 禁用外键检查
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      console.log('🔄 已禁用外键检查');
      
      try {
        await sequelize.sync({ force: true });
        console.log('✅ 数据库强制同步完成（所有表已重建）');
      } finally {
        // 重新启用外键检查
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('🔄 已重新启用外键检查');
      }
    } else {
      await sequelize.sync({ alter: true });
      console.log('✅ 数据库同步完成');
    }
    
    // 显示创建的表
    console.log('\n📊 数据库表状态:');
    const [results] = await sequelize.query('SHOW TABLES');
    results.forEach(row => {
      const tableName = Object.values(row)[0];
      console.log(`   ✓ ${tableName}`);
    });
    
    console.log('=' .repeat(50));
    console.log('✅ 同步操作完成');
    
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
    process.exit(0);
  }
};

// 运行同步
runSync();
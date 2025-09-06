const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initDatabase, User } = require('../src/utils/database');

// 创建数据库目录
const createDatabaseDir = () => {
  const dbDir = path.join(__dirname, '../../database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ 创建数据库目录:', dbDir);
  }
};

// 创建默认管理员用户
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@banana.ai',
        password: 'admin123',
        tokenBalance: 100000
      });
      console.log('✅ 创建默认管理员用户: admin / admin123');
    } else {
      console.log('ℹ️  管理员用户已存在');
    }
  } catch (error) {
    console.error('❌ 创建管理员用户失败:', error.message);
  }
};

// 创建测试用户
const createTestUser = async () => {
  try {
    const testUserExists = await User.findOne({ where: { username: 'testuser' } });
    
    if (!testUserExists) {
      await User.create({
        username: 'testuser',
        email: 'test@banana.ai',
        password: 'test123',
        tokenBalance: 10000
      });
      console.log('✅ 创建测试用户: testuser / test123');
    } else {
      console.log('ℹ️  测试用户已存在');
    }
  } catch (error) {
    console.error('❌ 创建测试用户失败:', error.message);
  }
};

// 主初始化函数
const main = async () => {
  try {
    console.log('🚀 开始初始化数据库...');
    console.log('=' .repeat(50));
    
    // 1. 创建数据库目录
    createDatabaseDir();
    
    // 2. 初始化数据库和表
    await initDatabase();
    
    // 3. 创建默认用户
    await createDefaultAdmin();
    await createTestUser();
    
    console.log('=' .repeat(50));
    console.log('🎉 数据库初始化完成！');
    console.log('');
    console.log('📋 默认账户信息:');
    console.log('   管理员: admin / admin123 (余额: 100,000 tokens)');
    console.log('   测试用户: testuser / test123 (余额: 10,000 tokens)');
    console.log('');
    console.log('💡 提示: 您可以使用这些账户登录系统进行测试');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
};

// 运行初始化
main();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'banana_chat',
  process.env.DB_USER || 'banana_user',
  process.env.DB_PASSWORD || 'banana_chat',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false, // 将 console.log 改为 false 来禁用SQL日志
    define: {
      timestamps: true,
      underscored: true,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 测试数据库连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL 数据库连接成功');
  } catch (error) {
    console.error('❌ MySQL 数据库连接失败:', error);
    process.exit(1);
  }
};

// 同步数据库
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ 数据库同步成功');
  } catch (error) {
    console.error('❌ 数据库同步失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  syncDatabase
};
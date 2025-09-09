const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, closeDatabase } = require('./src/utils/database');

// 导入路由
const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chat');
const paymentRoutes = require('./src/routes/payment');
const userRoutes = require('./src/routes/user');
const sessionsRoutes = require('./src/routes/sessions');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// 添加调试图片静态服务
app.use('/uploads/debug-images', express.static(path.join(__dirname, 'uploads/debug-images')));

// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/wechat', require('./src/routes/wechat')); // 新增微信路由

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 根据环境变量决定是否执行完整初始化
    if (process.env.FORCE_DB_INIT === 'true' || process.env.NODE_ENV === 'production') {
      // 完整的数据库初始化（包含同步）
      await initDatabase();
    } else {
      // 开发环境：仅测试连接，不同步表结构
      const { testConnection } = require('./src/config/database');
      await testConnection();
      console.log('🔄 开发环境：跳过数据库同步，仅验证连接');
    }
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📊 健康检查: http://localhost:${PORT}/api/health`);
      console.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
};

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('\n🔄 正在关闭服务器...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🔄 正在关闭服务器...');
  await closeDatabase();
  process.exit(0);
});

// 启动应用
startServer();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os'); // 添加os模块
require('dotenv').config();

const {  closeDatabase } = require('./src/utils/database');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 配置静态文件服务 - 提供uploads目录的公共访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 导入路由
const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chat');
const userRoutes = require('./src/routes/user');
const sessionsRoutes = require('./src/routes/sessions');
const WechatModule = require('./src/wechat');
const AlipayModule = require('./src/alipay');
const payplanRoutes = require('./src/routes/payplan');
const paymentRoutes = require('./src/routes/payment');
const announcementRoutes = require('./src/routes/announcement');
// 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/user', userRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/wechat', WechatModule.init());
app.use('/api/alipay', AlipayModule.init());
app.use('/api/payplan', payplanRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/announcement', announcementRoutes);

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

// 获取本机IP地址的函数
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // 跳过内部地址和IPv6地址
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost'; // 如果没找到，返回localhost作为备选
};

// 启动服务器
const startServer = async () => {
  try {

    const { testConnection } = require('./src/config/database');
    await testConnection();
    
    // 获取本机IP地址
    const localIP = getLocalIP();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://${localIP}:${PORT}`);
      console.log(`📊 健康检查: http://${localIP}:${PORT}/api/health`);
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
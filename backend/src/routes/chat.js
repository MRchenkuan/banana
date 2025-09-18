const express = require('express');
const { authenticateToken, checkTokenBalance } = require('../middleware/auth');
const { upload } = require('../config/uploadConfig');
const TextStreamHandler = require('../handlers/textStreamHandler');
const ImageStreamHandler = require('../handlers/imageStreamHandler');
const ChatHistoryHandler = require('../handlers/chatHistoryHandler');
const TokenManager = require('../utils/tokenManager');

const router = express.Router();

// Token预验证中间件（在文件上传后执行）
const chenkAttachements = async (req, res, next) => {
  try {
    const { message } = req.body;
    const images = req.files || [];
    const imageCount = images ? images.length : 0;
    
    // 图片大于 2
    if (imageCount > 2) {
      return res.status(400).json({ error: '最多支持上传2张图片' });
    }

    if (!images.every(file => file.mimetype.startsWith('image/'))) {
      return res.status(400).json({ error: '请上传图片文件' });
    }

    next();
  } catch (error) {
    console.error('Token预验证失败:', error);
    
    // 如果token验证失败，需要清理已上传的临时文件
    if (req.files && req.files.length > 0) {
      const fs = require('fs');
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(400).json({ error: error.message });
  }
};

// 获取聊天历史
router.get('/history', authenticateToken, async (req, res) => {
  const handler = new ChatHistoryHandler(req, res);
  await handler.handle();
});

// 流式文本聊天路由
router.post('/text-stream', 
  authenticateToken, 
  checkTokenBalance, 
  async (req, res) => {
    const handler = new TextStreamHandler(req, res);
    await handler.handle();
});

// 流式图片聊天路由 - 先上传文件，再验证token
router.post('/image-stream', 
  authenticateToken, 
  checkTokenBalance, // 添加全局余额检查
  upload.tempFile.array('images', 2), // 先上传文件
  chenkAttachements, // 再验证token
  async (req, res) => {
    const handler = new ImageStreamHandler(req, res);
    await handler.handle();
  }
);

module.exports = router;

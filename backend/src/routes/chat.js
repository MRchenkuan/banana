const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../config/uploadConfig');
const TextStreamHandler = require('../handlers/textStreamHandler');
const ImageStreamHandler = require('../handlers/imageStreamHandler');
const ChatHistoryHandler = require('../handlers/chatHistoryHandler'); // 新建

const router = express.Router();

// 获取聊天历史
router.get('/history', authenticateToken, async (req, res) => {
  const handler = new ChatHistoryHandler(req, res);
  await handler.handle();
});

// 流式文本聊天路由
router.post('/text-stream', authenticateToken, async (req, res) => {
  const handler = new TextStreamHandler(req, res);
  await handler.handle();
});

// 流式图片聊天路由
router.post('/image-stream', authenticateToken, ...upload.single('image'), async (req, res) => {
  const handler = new ImageStreamHandler(req, res);
  await handler.handle();
});
module.exports = router;

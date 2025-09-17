const express = require('express');
const { Announcement } = require('../models');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取公告列表
router.get('/list', async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: {
        isActive: true
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']],
      attributes: ['id', 'title', 'content', 'type', 'priority', 'createdAt']
    });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('获取公告列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取公告列表失败'
    });
  }
});

module.exports = router;
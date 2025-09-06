const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { User, ChatMessage, TokenUsage } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// 获取用户 token 余额
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['tokenBalance']
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      balance: user.tokenBalance
    });
  } catch (error) {
    console.error('获取用户余额错误:', error);
    res.status(500).json({ error: '获取余额失败' });
  }
});

// 获取 token 使用统计
router.get('/usage-stats', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 今日使用量
    const todayUsage = await TokenUsage.sum('tokensUsed', {
      where: {
        userId: req.user.userId,
        createdAt: {
          [Op.gte]: today
        }
      }
    }) || 0;

    // 本月使用量
    const monthUsage = await TokenUsage.sum('tokensUsed', {
      where: {
        userId: req.user.userId,
        createdAt: {
          [Op.gte]: thisMonth
        }
      }
    }) || 0;

    // 总使用量
    const totalUsage = await TokenUsage.sum('tokensUsed', {
      where: {
        userId: req.user.userId
      }
    }) || 0;

    // 聊天次数统计
    const chatCount = await ChatMessage.count({
      where: {
        userId: req.user.userId
      }
    });

    res.json({
      todayUsage,
      monthUsage,
      totalUsage,
      chatCount
    });
  } catch (error) {
    console.error('获取使用统计错误:', error);
    res.status(500).json({ error: '获取使用统计失败' });
  }
});

module.exports = router;
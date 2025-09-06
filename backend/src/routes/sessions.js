const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { User, Session, ChatMessage } = require('../models');
const { Op } = require('sequelize');
const path = require('path'); // 添加path模块导入

const router = express.Router();

// 获取用户的会话列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    const sessions = await Session.findAll({
      where: { 
        userId: req.user.userId,
        isActive: true
      },
      order: [['lastMessageAt', 'DESC'], ['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: ChatMessage,
        as: 'messages',
        limit: 1,
        order: [['createdAt', 'DESC']],
        required: false
      }]
    });

    const total = await Session.count({
      where: { 
        userId: req.user.userId,
        isActive: true
      }
    });

    res.json({
      sessions: sessions.map(session => ({
        id: session.id,
        title: session.title,
        lastMessageAt: session.lastMessageAt,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        lastMessage: session.messages && session.messages[0] ? {
          content: session.messages[0].userMessage,
          createdAt: session.messages[0].createdAt
        } : null
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取会话列表错误:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

// 创建新会话
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title = '新对话' } = req.body;
    
    const session = await Session.create({
      userId: req.user.userId,
      title: title.trim() || '新对话'
    });

    res.status(201).json({
      id: session.id,
      title: session.title,
      lastMessageAt: session.lastMessageAt,
      messageCount: session.messageCount,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('创建会话错误:', error);
    res.status(500).json({ error: '创建会话失败' });
  }
});

// 获取单个会话详情
router.get('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({
      where: {
        id: sessionId,
        userId: req.user.userId,
        isActive: true
      },
      include: [{
        model: ChatMessage,
        as: 'messages',
        order: [['createdAt', 'ASC']]
      }]
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    res.json({
      id: session.id,
      title: session.title,
      lastMessageAt: session.lastMessageAt,
      messageCount: session.messageCount,
      createdAt: session.createdAt,
      messages: session.messages.map(msg => ({
        id: msg.id,
        type: msg.type,
        userMessage: msg.userMessage,
        aiResponse: msg.aiResponse,
        imageUrl: msg.imageUrl,
        tokensUsed: msg.tokensUsed,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('获取会话详情错误:', error);
    res.status(500).json({ error: '获取会话详情失败' });
  }
});

// 更新会话标题
router.put('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: '会话标题不能为空' });
    }

    const [updatedRows] = await Session.update(
      { title: title.trim() },
      {
        where: {
          id: sessionId,
          userId: req.user.userId,
          isActive: true
        }
      }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ error: '会话不存在或无权限修改' });
    }

    const session = await Session.findByPk(sessionId);
    res.json({
      id: session.id,
      title: session.title,
      lastMessageAt: session.lastMessageAt,
      messageCount: session.messageCount,
      createdAt: session.createdAt
    });
  } catch (error) {
    console.error('更新会话标题错误:', error);
    res.status(500).json({ error: '更新会话标题失败' });
  }
});

// 删除会话（软删除）
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const [updatedRows] = await Session.update(
      { isActive: false },
      {
        where: {
          id: sessionId,
          userId: req.user.userId,
          isActive: true
        }
      }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ error: '会话不存在或已删除' });
    }

    res.json({ message: '会话删除成功' });
  } catch (error) {
    console.error('删除会话错误:', error);
    res.status(500).json({ error: '删除会话失败' });
  }
});

// 获取指定会话的消息列表 - 添加这个新路由
router.get('/:sessionId/messages', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // 验证会话是否存在且属于当前用户
    const session = await Session.findOne({
      where: {
        id: sessionId,
        userId: req.user.userId,
        isActive: true
      }
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在' });
    }

    // 获取消息列表 - 修改排序为DESC，获取最新的消息
    const messages = await ChatMessage.findAll({
      where: {
        sessionId: sessionId
      },
      order: [['createdAt', 'DESC']], // 改为DESC，获取最新消息
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const total = await ChatMessage.count({
      where: {
        sessionId: sessionId
      }
    });

    res.json({
      // 返回的消息格式中缺少 streamStatus
      // 修改消息返回格式
      messages: messages.reverse().map(msg => ({ // 反转数组，让前端按时间顺序显示
        id: msg.id,
        type: msg.type,
        userMessage: msg.userMessage,
        aiResponse: msg.aiResponse,
        imageUrl: msg.imageUrl,
        tokensUsed: msg.tokensUsed,
        createdAt: msg.createdAt,
        streamStatus: msg.streamStatus, // 添加此字段
        isError: msg.streamStatus === 'error' // 添加便于前端判断的字段
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取会话消息错误:', error);
    res.status(500).json({ error: '获取会话消息失败' });
  }
});

module.exports = router;
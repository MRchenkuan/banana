const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { Order, TokenRecharge } = require('../models');
const { Op } = require('sequelize');

// 获取用户充值记录
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // 查询用户的订单记录
    const orders = await Order.findAll({
      where: { 
        userId: req.user.userId,
        status: {
          [Op.in]: ['paid', 'pending', 'failed', 'cancelled']
        }
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 格式化返回数据
    const paymentHistory = orders.map(order => ({
      id: order.id,
      orderId: order.orderNo,
      package: order.packageName,
      amount: parseFloat(order.amount),
      tokens: order.tokensPurchased,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      paidAt: order.paidAt
    }));

    res.json({
      success: true,
      data: paymentHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Order.count({
          where: { 
            userId: req.user.userId,
            status: {
              [Op.in]: ['paid', 'pending', 'failed', 'cancelled']
            }
          }
        })
      }
    });
  } catch (error) {
    console.error('获取充值记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取充值记录失败'
    });
  }
});

module.exports = router;
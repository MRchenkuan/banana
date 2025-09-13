const express = require('express');
const router = express.Router();
const PACKAGE_CONFIG = require('../config/packageConfig');

// 获取套餐列表
router.get('/list', (req, res) => {
  try {
      res.json({
        success: true,
        data: PACKAGE_CONFIG.packages
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: '获取套餐信息失败'
      });
    }
  })

module.exports = router;
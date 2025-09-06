const jwt = require('jsonwebtoken');
const { User } = require('../utils/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '无效的访问令牌' });
    }
    req.user = user;
    next();
  });
};

const checkTokenBalance = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['tokenBalance']
    });

    if (!user || user.tokenBalance <= 0) {
      return res.status(402).json({ 
        error: 'Token 余额不足，请充值后继续使用',
        balance: user ? user.tokenBalance : 0
      });
    }

    req.user.tokenBalance = user.tokenBalance;
    next();
  } catch (error) {
    console.error('检查 Token 余额失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

module.exports = {
  authenticateToken,
  checkTokenBalance
};
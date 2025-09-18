const jwt = require('jsonwebtoken');
const { User } = require('../utils/database');
const TokenManager = require('../utils/tokenManager');

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

    const { message } = req.body;
    const images = req.files || [];

    const user = await User.findByPk(req.user.userId, {
      attributes: ['tokenBalance']
    });

    // 没余额直接出
    if (!user || user.tokenBalance <= 0) {
      return res.status(402).json({ 
        error: 'Token 余额不足，请充值后继续使用',
        balance: user ? user.tokenBalance : 0
      });
    }


    // 估算文字和图片的token消耗
    const baseTokens = TokenManager.estimateTextTokens(message || '');
    // 估算图片的token 消耗
    const imageTokens = images.reduce((acc, file) => acc + TokenManager.estimateImageTokens(file), 0);
    const estimatedTokens = baseTokens + imageTokens;
    
    // 检查余额
    const {pass, balance} = await TokenManager.checkBalance(req.user, estimatedTokens);
    
    if (!pass) {
      return res.status(400).json({ error: 'Token余额不足',message: `当前余额: ${balance}` });
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
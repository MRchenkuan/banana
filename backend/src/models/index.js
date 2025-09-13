const { sequelize } = require('../config/database');
const User = require('./User');
const ChatMessage = require('./ChatMessage');
const TokenUsage = require('./TokenUsage');
const Session = require('./Session');
const MediaResource = require('./MediaResource');
const Order = require('./Order');
const TokenRecharge = require('./TokenRecharge');

// 定义模型关联
User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TokenUsage, { foreignKey: 'userId', as: 'tokenUsages' });
TokenUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ChatMessage.hasMany(TokenUsage, { foreignKey: 'chatMessageId', as: 'tokenUsages' });
TokenUsage.belongsTo(ChatMessage, { foreignKey: 'chatMessageId', as: 'chatMessage' });

// Session 关联关系
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Session.hasMany(ChatMessage, { foreignKey: 'sessionId', as: 'messages' });
ChatMessage.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

// TokenRecharge 关联关系
User.hasMany(TokenRecharge, { foreignKey: 'userId', as: 'tokenRecharges' });
TokenRecharge.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order 与 TokenRecharge 关联 - 修改关联关系，使用正确的外键
Order.hasMany(TokenRecharge, { 
  foreignKey: 'sourceId', 
  constraints: false, // 禁用外键约束
  scope: {
    source: 'payment'
  },
  as: 'tokenRecharges' 
});

// 修改 TokenRecharge 到 Order 的关联，使用正确的条件
TokenRecharge.belongsTo(Order, { 
  foreignKey: 'sourceId', 
  constraints: false, // 禁用外键约束
  as: 'order' 
});

module.exports = {
  sequelize,
  User,
  ChatMessage,
  TokenUsage,
  Session,
  MediaResource,
  Order,
  TokenRecharge
};
const { sequelize } = require('../config/database');
const User = require('./User');
const ChatMessage = require('./ChatMessage');
const TokenUsage = require('./TokenUsage');
const Session = require('./Session');
const MediaResource = require('./MediaResource');
const Order = require('./Order');
const TokenRecharge = require('./TokenRecharge');
const Announcement = require('./Announcement');

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

// 导出所有模型
module.exports = {
  sequelize,
  User,
  ChatMessage,
  TokenUsage,
  Session,
  MediaResource,
  Order,
  TokenRecharge,
  Announcement
};
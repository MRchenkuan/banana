const { sequelize } = require('../config/database');
const User = require('./User');
const ChatMessage = require('./ChatMessage');
const PaymentRecord = require('./PaymentRecord');
const TokenUsage = require('./TokenUsage');
const Session = require('./Session');

// 定义模型关联
User.hasMany(ChatMessage, { foreignKey: 'userId', as: 'chatMessages' });
ChatMessage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(PaymentRecord, { foreignKey: 'userId', as: 'paymentRecords' });
PaymentRecord.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(TokenUsage, { foreignKey: 'userId', as: 'tokenUsages' });
TokenUsage.belongsTo(User, { foreignKey: 'userId', as: 'user' });

ChatMessage.hasMany(TokenUsage, { foreignKey: 'chatMessageId', as: 'tokenUsages' });
TokenUsage.belongsTo(ChatMessage, { foreignKey: 'chatMessageId', as: 'chatMessage' });

// Session 关联关系
User.hasMany(Session, { foreignKey: 'userId', as: 'sessions' });
Session.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Session.hasMany(ChatMessage, { foreignKey: 'sessionId', as: 'messages' });
ChatMessage.belongsTo(Session, { foreignKey: 'sessionId', as: 'session' });

module.exports = {
  sequelize,
  User,
  ChatMessage,
  PaymentRecord,
  TokenUsage,
  Session
};
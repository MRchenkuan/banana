const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenUsage = sequelize.define('TokenUsage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  chatMessageId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'chat_messages',
      key: 'id'
    }
  },
  tokensUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  operation: {
    type: DataTypes.ENUM('chat', 'image_analysis', 'deduction', 'refund'),
    allowNull: false,
    defaultValue: 'chat'
  },
  balanceBefore: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'token_usage',
  indexes: [
    {
      fields: ['user_id', 'created_at']  // 使用下划线命名
    },
    {
      fields: ['operation']
    }
  ]
});

module.exports = TokenUsage;
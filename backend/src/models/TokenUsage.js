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
  inputTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: '输入token消耗量（promptTokenCount）'
  },
  outputTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0
    },
    comment: '输出token消耗量（candidatesTokenCount）'
  },
  tokenBalance: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0
    },
    comment: '操作后的token余额快照'
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
      fields: ['user_id', 'created_at'],  // 用户消费记录查询
      name: 'idx_user_time'
    }
  ]
});

module.exports = TokenUsage;
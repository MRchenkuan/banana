const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Session = sequelize.define('Session', {
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
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    defaultValue: '新对话'
  },
  titleSet: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '标题是否已被设置（区分默认标题和自定义标题）'
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  messageCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'sessions',
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['user_id', 'is_active']
    },
    {
      fields: ['last_message_at']
    }
  ]
});

module.exports = Session;
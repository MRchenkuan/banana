const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TokenRecharge = sequelize.define('TokenRecharge', {
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
  tokensAdded: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    },
    comment: '增加的token数量'
  },
  balanceBefore: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '充值前余额'
  },
  balanceAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '充值后余额'
  },
  source: {
    type: DataTypes.ENUM('payment', 'gift', 'refund', 'promotion', 'adjustment', 'other'),
    allowNull: false,
    defaultValue: 'payment',
    comment: 'token来源类型'
  },
  sourceId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '来源ID，如PaymentRecord的ID'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '充值描述，如活动名称、赠送原因等'
  },
  metadata: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '额外元数据，JSON格式'
  },
  createdBy: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '创建者，如system、admin等'
  }
}, {
  tableName: 'token_recharges',
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['source', 'source_id']
    }
  ]
});

module.exports = TokenRecharge;
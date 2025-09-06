const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentRecord = sequelize.define('PaymentRecord', {
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
  orderId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tokensPurchased: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'wechat'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'payment_records',
  indexes: [
    {
      fields: ['user_id', 'created_at']  // 修复：userId -> user_id, createdAt -> created_at
    },
    {
      fields: ['order_id']  // 修复：orderId -> order_id
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = PaymentRecord;
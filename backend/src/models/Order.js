const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
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
  orderNo: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '订单号'
  },
  packageId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '套餐ID (basic, standard, premium, enterprise)'
  },
  packageName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '套餐名称'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: '订单金额（元）'
  },
  tokensPurchased: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    },
    comment: '购买的Token数量'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '订单状态'
  },
  paymentMethod: {
    type: DataTypes.ENUM('wechat', 'alipay', 'balance'),
    allowNull: false,
    defaultValue: 'wechat',
    comment: '支付方式'
  },
  paymentChannel: {
    type: DataTypes.ENUM('native', 'jsapi', 'h5', 'app'),
    allowNull: true,
    comment: '支付渠道'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '第三方支付交易号'
  },
  prepayId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '预支付交易会话标识'
  },
  qrCodeUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '支付二维码URL'
  },
  clientIp: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '客户端IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
  },
  expiredAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '订单过期时间'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付完成时间'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '退款时间'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '退款金额'
  },
  refundReason: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '退款原因'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '订单备注'
  }
}, {
  tableName: 'orders',
  indexes: [
    {
      fields: ['user_id', 'created_at']
    },
    {
      fields: ['order_no']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_method']
    },
    {
      fields: ['transaction_id']
    },
    {
      fields: ['expired_at']
    }
  ]
});

// 实例方法：检查订单是否过期
Order.prototype.isExpired = function() {
  return this.expiredAt && new Date() > this.expiredAt;
};

// 实例方法：标记订单为已支付
Order.prototype.markAsPaid = async function(transactionId) {
  this.status = 'paid';
  this.transactionId = transactionId;
  this.paidAt = new Date();
  await this.save();
  return this;
};

// 实例方法：取消订单
Order.prototype.cancel = async function(reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.remark = reason;
  await this.save();
  return this;
};

// 实例方法：申请退款
Order.prototype.refund = async function(amount, reason) {
  this.status = 'refunded';
  this.refundedAt = new Date();
  this.refundAmount = amount;
  this.refundReason = reason;
  await this.save();
  return this;
};

module.exports = Order;
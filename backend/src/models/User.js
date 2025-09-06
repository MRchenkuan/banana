const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true, // 微信登录时可能没有邮箱
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true, // 微信登录用户可能没有密码
    validate: {
      len: [6, 255]
    }
  },
  // 新增微信相关字段
  wechatOpenId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: '微信OpenID'
  },
  wechatUnionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: '微信UnionID'
  },
  wechatNickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '微信昵称'
  },
  wechatAvatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '微信头像URL'
  },
  loginType: {
    type: DataTypes.ENUM('password', 'wechat'),
    allowNull: false,
    defaultValue: 'password',
    comment: '登录方式'
  },
  tokenBalance: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// 实例方法：验证密码
User.prototype.validatePassword = async function(password) {
  if (!this.password) {
    return false; // 微信用户没有密码
  }
  return await bcrypt.compare(password, this.password);
};

// 实例方法：扣除tokens
User.prototype.deductTokens = async function(amount) {
  this.tokenBalance -= amount;
  await this.save();
  return this.tokenBalance;
};

// 实例方法：增加tokens
User.prototype.addTokens = async function(amount) {
  this.tokenBalance += amount;
  await this.save();
  return this.tokenBalance;
};

module.exports = User;
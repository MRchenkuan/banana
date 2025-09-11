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
    allowNull: true, // 改为可选，从微信昵称获取
    validate: {
      len: [1, 50]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true, // 微信登录时可能没有邮箱
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: true, // 微信登录用户不需要密码
    validate: {
      len: [6, 255]
    }
  },
  // 微信相关字段 - 作为主要身份标识
  wechatOpenId: {
    type: DataTypes.STRING(100),
    allowNull: false, // 改为必填
    unique: true,
    comment: '微信OpenID - 主要身份标识'
  },
  wechatUnionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: '微信UnionID'
  },
  wechatNickname: {
    type: DataTypes.STRING(100),
    allowNull: false, // 改为必填
    comment: '微信昵称'
  },
  wechatAvatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '微信头像URL'
  },
  loginType: {
    type: DataTypes.ENUM('wechat'), // 只保留微信登录
    allowNull: false,
    defaultValue: 'wechat',
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
      // 移除密码加密逻辑，因为只使用微信登录
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      // 如果没有用户名，使用微信昵称
      if (!user.username && user.wechatNickname) {
        user.username = user.wechatNickname;
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
      // 同步更新用户名为微信昵称
      if (user.changed('wechatNickname') && user.wechatNickname) {
        user.username = user.wechatNickname;
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
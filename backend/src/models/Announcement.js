const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '公告标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '公告内容'
  },
  type: {
    type: DataTypes.ENUM('info', 'warning', 'success', 'error'),
    allowNull: false,
    defaultValue: 'info',
    comment: '公告类型'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '优先级，数字越大优先级越高'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否启用'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '开始显示时间'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '结束显示时间'
  },
  targetUsers: {
    type: DataTypes.ENUM('all', 'new', 'vip'),
    allowNull: false,
    defaultValue: 'all',
    comment: '目标用户群体'
  },
  clickAction: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '点击动作（URL或其他操作）'
  },
  viewCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '查看次数'
  },
  clickCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '点击次数'
  }
}, {
  tableName: 'announcements',
  indexes: [
    {
      fields: ['is_active', 'priority', 'start_time']
    },
    {
      fields: ['target_users']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Announcement;
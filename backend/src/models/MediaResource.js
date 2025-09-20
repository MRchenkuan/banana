const { DataTypes, Op } = require('sequelize');  // 添加 Op 导入
const { sequelize } = require('../config/database');

const MediaResource = sequelize.define('MediaResource', {
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
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  storageType: {
    type: DataTypes.ENUM('ros', 'local'),
    allowNull: false,
    defaultValue: 'ros'
  },
  storageKey: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  storageUrl: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  source: {
    type: DataTypes.ENUM('user_upload', 'ai_generated'),
    allowNull: false,
    defaultValue: 'user_upload'
  }
}, {
  tableName: 'media_resources',
  indexes: [
    {
      fields: ['user_id', 'created_at'],
      name: 'idx_user_time'
    },
    {
      fields: ['storage_key'],
      unique: true,
      name: 'idx_storage_key',
      where: {
        storage_key: {
          [Op.ne]: null
        }
      }
    }
  ]
});

module.exports = MediaResource;
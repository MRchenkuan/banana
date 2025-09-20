const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { STREAM_STATUS_VALUES } = require('../constants/streamStatus');

const ChatMessage = sequelize.define('ChatMessage', {
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
  sessionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sessions',
      key: 'id'
    }
  },
  // 移除 type 字段，所有消息都是文本
  userMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  aiResponse: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // 移除 imageUrl 字段，图片以Markdown形式嵌入到aiResponse中
  tokensUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  streamStatus: {
    type: DataTypes.ENUM(...STREAM_STATUS_VALUES),
    allowNull: false,
    defaultValue: 'pending'
  },

  estimatedTokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  // 新增字段：输入token消耗
  inputTokens: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '用户输入消息的token消耗'
  },
  // 新增字段：输出token消耗
  outputTokens: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'AI响应的token消耗'
  },
  // 新增字段：当前token余额
  tokenBalance: {
    type: DataTypes.INTEGER,
    comment: '消息发送时的用户token余额'
  }
}, {
  tableName: 'chat_messages',
  indexes: [
    {
      fields: ['session_id', 'created_at'],  // 会话消息列表查询
      name: 'idx_session_time'
    },
    {
      fields: ['user_id', 'created_at'],  // 用户消息历史查询
      name: 'idx_user_time'
    }
  ],
  hooks: {
    // 消息创建后更新session统计
    afterCreate: async (chatMessage, options) => {
      try {
        // 使用sequelize.models来避免循环引用
        const Session = sequelize.models.Session;
        if (Session) {
          await Session.increment('messageCount', {
            where: { id: chatMessage.sessionId }
          });
          await Session.update(
            { lastMessageAt: new Date() },
            { where: { id: chatMessage.sessionId } }
          );
        }
      } catch (error) {
        console.error('更新session统计失败:', error);
      }
    },
    
    // 消息删除后更新session统计
    afterDestroy: async (chatMessage, options) => {
      try {
        // 使用sequelize.models来避免循环引用
        const Session = sequelize.models.Session;
        if (Session) {
          await Session.decrement('messageCount', {
            where: { id: chatMessage.sessionId }
          });
        }
      } catch (error) {
        console.error('更新session统计失败:', error);
      }
    }
  }
});

module.exports = ChatMessage;
const { Session } = require('../models');

class SessionManager {
  
  static async updateSessionTitle(sessionId, title) {
    if (!sessionId || !title) return;
    
    try {
      const session = await Session.findByPk(sessionId);
      if (session) {
        await session.update({ 
          title,
          titleSet: true  // 标记标题已被设置
        });
        return session;
      }
    } catch (error) {
      console.error('更新session标题错误:', error);
    }
  }
}

module.exports = SessionManager;
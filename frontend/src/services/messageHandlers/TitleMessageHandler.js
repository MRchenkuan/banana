import BaseMessageHandler from './BaseMessageHandler';

/**
 * 标题消息处理器
 */
class TitleMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { title } = data;
    const { sessionId } = metadata;
    
    console.log('TitleMessageHandler 调试信息:', {
      title,
      sessionId,
      metadata,
      currentSessions: this.context.setSessions // 查看当前会话状态
    });
    
    if (!sessionId) {
      console.error('sessionId 未传递到 TitleMessageHandler');
      return;
    }
    
    // 更新会话标题
    this.context.setSessions((prev) => {
      console.log('更新前的会话列表:', prev);
      const updated = prev.map((session) =>
        session.id === sessionId
          ? { ...session, title: title }
          : session
      );
      console.log('更新后的会话列表:', updated);
      return updated;
    });
  }
}

export default TitleMessageHandler;
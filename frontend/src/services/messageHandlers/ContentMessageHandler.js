import BaseMessageHandler from './BaseMessageHandler';
import TextMessageHandler from './TextMessageHandler';
import ImageMessageHandler from './ImageMessageHandler';

/**
 * 统一内容消息处理器
 * 根据messageType字段分发到具体的处理器
 */
class ContentMessageHandler extends BaseMessageHandler {
  constructor(context) {
    super(context);
    this.textHandler = new TextMessageHandler(context);
    this.imageHandler = new ImageMessageHandler(context);
  }

  handle(data, metadata) {
    this.validate(data);
    
    // 根据messageType字段分发到具体处理器
    const messageType = data.messageType || data.type || 'text';
    
    console.log('ContentMessageHandler处理消息:', { messageType, data });
    
    switch (messageType) {
      case 'image':
        return this.imageHandler.handle(data, metadata);
      case 'text':
      default:
        return this.textHandler.handle(data, metadata);
    }
  }
}

export default ContentMessageHandler;
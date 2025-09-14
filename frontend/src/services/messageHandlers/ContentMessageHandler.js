import BaseMessageHandler from './BaseMessageHandler';
import TextMessageHandler from './TextMessageHandler';
import ImageMessageHandler from './ImageMessageHandler';
import { tokenMonitorEvents } from '../../utils/tokenMonitorEvents';

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
    
    // 直接从stream数据中提取totalTokensUsed并发送到monitor
    if (data.metadata?.totalTokensUsed) {
      // 检查数据结构并适配为TokenMonitor期望的格式
      const tokenData = data.metadata.totalTokensUsed;
      let formattedTokenData = tokenData;
      
      // 如果是新的数据结构，进行适配
      if (tokenData && typeof tokenData === 'object') {
        // 确保有正确的字段
        if (tokenData.usageMetadata) {
          formattedTokenData = tokenData.usageMetadata;
        }
      }
      
      tokenMonitorEvents.publish({
        totalTokensUsed: formattedTokenData,
        timestamp: new Date(),
        messageType: data.messageType || data.type || 'text'
      });
    }
    
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
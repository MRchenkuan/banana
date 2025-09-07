import BaseMessageHandler from './BaseMessageHandler';

/**
 * 处理状态消息处理器
 */
class ProcessingMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { message } = data;
    const { thinkingMessageId, onProcessing } = metadata;
    
    console.log('处理状态:', message);
    
    // 更新思考消息的内容
    this.context.setMessages((prev) => 
      prev.map((msg) => 
        msg.id === thinkingMessageId 
          ? { ...msg, content: message }
          : msg
      )
    );
    
    // 调用处理状态回调
    onProcessing && onProcessing(message);
  }
}

export default ProcessingMessageHandler;
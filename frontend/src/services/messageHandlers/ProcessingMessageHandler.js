import BaseMessageHandler from './BaseMessageHandler';

/**
 * 处理状态消息处理器
 */
class ProcessingMessageHandler extends BaseMessageHandler {
  handle(data, metadata) {
    this.validate(data);
    
    const { message } = data;
    const { thinkingMessageId, onProcessing } = metadata;    
    // 更新思考消息的内容
    this.context.setMessages((prev) => 
      prev.map((msg) => {
         if(msg.id === thinkingMessageId){
          return { 
            ...msg, 
            content: message, 
            isProcessing: true, 
            isReceived: false
          }
         } else {
          return msg;
         }
      })
    );
    
    // 调用处理状态回调
    onProcessing && onProcessing(message);
  }
}

export default ProcessingMessageHandler;
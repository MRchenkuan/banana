class ChatValidation {
  static validateTextMessage(message) {
    if (!message || message.trim() === '') {
      throw new Error('消息内容不能为空');
    }
    
    if (message.length > 10000) {
      throw new Error('消息内容过长，请控制在10000字符以内');
    }
    
    return true;
  }
  
  static validateImageMessage(message, imagePath) {
    if (!imagePath) {
      throw new Error('请上传图片文件');
    }
    
    if (!message || message.trim() === '') {
      throw new Error('请输入分析/修改图片的要求');
    }
    
    return true;
  }
  
  static validatePagination(page, limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    
    if (pageNum < 1) {
      throw new Error('页码必须大于0');
    }
    
    if (limitNum < 1 || limitNum > 100) {
      throw new Error('每页数量必须在1-100之间');
    }
    
    return { page: pageNum, limit: limitNum };
  }
}

module.exports = ChatValidation;
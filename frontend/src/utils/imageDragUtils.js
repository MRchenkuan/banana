/**
 * 图片拖拽工具函数
 */

/**
 * 创建图片拖拽处理函数
 * @param {string} imageSrc - 图片源地址
 * @returns {function} - 拖拽开始事件处理函数
 */
export const createImageDragHandler = (imageSrc) => {
  return (e) => {
    // 将图片数据存储到拖拽事件中
    e.dataTransfer.setData('text/plain', imageSrc);
    e.dataTransfer.setData('application/x-image-src', imageSrc);
    e.dataTransfer.effectAllowed = 'copy';
    
    // 不设置自定义拖拽预览，使用浏览器默认效果
    console.log('开始拖拽图片:', imageSrc);
  };
};

/**
 * 获取图片拖拽样式
 * @returns {object} - 拖拽相关的样式对象
 */
export const getDragImageStyle = () => ({
  cursor: 'grab',
  userSelect: 'none'
});

/**
 * 检查是否为图片拖拽事件
 * @param {DragEvent} e - 拖拽事件
 * @returns {string|null} - 如果是图片拖拽返回图片URL，否则返回null
 */
export const getImageFromDragEvent = (e) => {
  // 首先检查自定义数据类型（内部拖拽）
  const customImageSrc = e.dataTransfer.getData('application/x-image-src');
  if (customImageSrc) {
    return customImageSrc;
  }
  
  // 检查 text/uri-list（标准 URL 列表）
  const uriList = e.dataTransfer.getData('text/uri-list');
  if (uriList) {
    const urls = uriList.split('\n').filter(url => url.trim());
    for (const url of urls) {
      if (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url.trim();
      }
    }
  }
  
  // 检查 text/plain（纯文本 URL）
  const plainText = e.dataTransfer.getData('text/plain');
  if (plainText && (plainText.startsWith('data:image/') || plainText.startsWith('http://') || plainText.startsWith('https://') || plainText.startsWith('blob:'))) {
    return plainText.trim();
  }
  
  // 检查 text/html（从 HTML 中提取图片 src）
  const htmlData = e.dataTransfer.getData('text/html');
  if (htmlData) {
    const imgMatch = htmlData.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1]) {
      const src = imgMatch[1];
      if (src.startsWith('data:image/') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
        return src;
      }
    }
  }
  
  return null;
};
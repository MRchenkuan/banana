/**
 * 图片优化工具
 * 为ROS图片URL添加处理参数
 */

// 图片优化预设
export const IMAGE_PRESETS = {
  // 缩略图 - 小尺寸，高压缩
  thumbnail: {
    width: 150,
    height: 150,
    quality: 70,
    format: 'webp'
  },
  // 画廊图片 - 中等尺寸
  gallery: {
    width: 400,
    height: 400,
    quality: 75,
    format: 'webp'
  },
  // 预览图片 - 适中尺寸
  preview: {
    width: 300,
    height: 200,
    quality: 80,
    format: 'webp'
  },
  // 背景图片 - 大尺寸，适中压缩
  background: {
    width: 1200,
    height: 600,
    quality: 80,
    format: 'webp'
  },
  // 高清图片 - 保持原始比例
  hd: {
    width: 800,
    quality: 85,
    format: 'webp'
  },
  chat: {
    width: 300,
    height: 300,
    quality: 75,
    format: 'webp'
  },
  chatPreview: {
    width: 800,
    quality: 85,
    format: 'webp'
  }
};

/**
 * 为图片URL添加优化参数
 * @param {string} imageUrl - 原始图片URL
 * @param {string|object} preset - 预设名称或自定义参数
 * @returns {string} 优化后的图片URL
 */
export function optimizeImage(imageUrl, preset = 'gallery') {
  if (!imageUrl || !imageUrl.includes('pub-image-bed.cn-nb1.rains3.com')) {
    return imageUrl; // 非ROS图片直接返回
  }

  let params;
  if (typeof preset === 'string') {
    params = IMAGE_PRESETS[preset];
  } else {
    params = preset;
  }

  if (!params) {
    return imageUrl;
  }

  // 构建处理参数
  const processParams = [];
  
  // 尺寸调整
  if (params.width && params.height) {
    processParams.push(`image/resize,w_${params.width},h_${params.height},m_fill`);
  } else if (params.width) {
    processParams.push(`image/resize,w_${params.width}`);
  } else if (params.height) {
    processParams.push(`image/resize,h_${params.height}`);
  }
  
  // 质量压缩
  if (params.quality) {
    processParams.push(`quality,q_${params.quality}`);
  }
  
  // 格式转换
  if (params.format) {
    processParams.push(`format,${params.format}`);
  }
  
  if (processParams.length === 0) {
    return imageUrl;
  }
  
  const processString = processParams.join('/');
  return `${imageUrl}?x-oss-process=${processString}`;
}

/**
 * 响应式图片优化
 * 根据设备类型返回不同尺寸的图片
 */
export function getResponsiveImage(imageUrl, sizes = {}) {
  const defaultSizes = {
    mobile: { width: 300, quality: 70 },
    tablet: { width: 600, quality: 75 },
    desktop: { width: 1200, quality: 80 }
  };
  
  const finalSizes = { ...defaultSizes, ...sizes };
  
  return {
    mobile: optimizeImage(imageUrl, finalSizes.mobile),
    tablet: optimizeImage(imageUrl, finalSizes.tablet),
    desktop: optimizeImage(imageUrl, finalSizes.desktop)
  };
}

export default {
  optimizeImage,
  getResponsiveImage,
  IMAGE_PRESETS
};
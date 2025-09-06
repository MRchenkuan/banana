import imageCompression from 'browser-image-compression';

/**
 * 压缩图片到指定大小
 * @param {File} file - 原始图片文件
 * @param {number} maxSizeKB - 最大文件大小（KB）
 * @returns {Promise<File>} 压缩后的文件
 */
export const compressImage = async (file, maxSizeKB = 500) => {
  const options = {
    maxSizeMB: maxSizeKB / 1024, // 转换为MB
    maxWidthOrHeight: 1920, // 最大宽度或高度
    useWebWorker: true, // 使用Web Worker提高性能
    fileType: 'image/jpeg', // 统一输出为JPEG格式
    initialQuality: 0.8 // 初始质量
  };

  try {
    console.log('开始压缩图片:', {
      原始文件名: file.name,
      原始大小: `${(file.size / 1024).toFixed(2)}KB`,
      目标大小: `${maxSizeKB}KB`
    });

    const compressedFile = await imageCompression(file, options);
    
    console.log('图片压缩完成:', {
      压缩后大小: `${(compressedFile.size / 1024).toFixed(2)}KB`,
      压缩比: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
    });

    return compressedFile;
  } catch (error) {
    console.error('图片压缩失败:', error);
    throw new Error('图片压缩失败，请重试');
  }
};

/**
 * 批量压缩图片
 * @param {File[]} files - 图片文件数组
 * @param {number} maxSizeKB - 最大文件大小（KB）
 * @param {Function} onProgress - 进度回调
 * @returns {Promise<File[]>} 压缩后的文件数组
 */
export const compressImages = async (files, maxSizeKB = 500, onProgress) => {
  const compressedFiles = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      // 如果文件已经小于限制，直接使用
      if (file.size <= maxSizeKB * 1024) {
        compressedFiles.push(file);
        console.log(`文件 ${file.name} 无需压缩`);
      } else {
        const compressedFile = await compressImage(file, maxSizeKB);
        compressedFiles.push(compressedFile);
      }
      
      // 调用进度回调
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`压缩文件 ${file.name} 失败:`, error);
      throw error;
    }
  }
  
  return compressedFiles;
};
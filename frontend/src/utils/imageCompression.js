import imageCompression from 'browser-image-compression';
import { heicTo, isHeic } from 'heic-to';

/**
 * 检测并转换 HEIC 格式
 * @param {File} file - 原始文件
 * @returns {Promise<File>} 转换后的文件
 */
const convertHeicIfNeeded = async (file) => {
  // 使用 isHeic 函数检测 HEIC 格式
  const isHeicFile = await isHeic(file).catch(() => false);
  
  if (isHeicFile || 
      file.type === 'image/heic' || file.type === 'image/heif' || 
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
    
    console.log('检测到 HEIC 格式，开始转换...');
    
    try {
      // 使用 heic-to 进行转换
      const convertedBlob = await heicTo({
        blob: file,
        type: 'image/jpeg',
        quality: 0.9
      });
      
      // 创建新的 File 对象
      const convertedFile = new File(
        [convertedBlob], 
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );
      
      console.log('HEIC 转换完成:', {
        原始格式: file.type,
        转换后格式: convertedFile.type,
        原始大小: `${(file.size / 1024).toFixed(2)}KB`,
        转换后大小: `${(convertedFile.size / 1024).toFixed(2)}KB`
      });
      
      return convertedFile;
    } catch (error) {
      console.error('HEIC 转换失败:', error);
      // 提供更详细的错误信息
      if (error.message.includes('unsupported')) {
        throw new Error('不支持的HEIC格式版本，请尝试使用其他图片格式');
      } else if (error.message.includes('memory')) {
        throw new Error('图片文件过大，请压缩后重试');
      } else {
        throw new Error('HEIC 格式转换失败，请重试或使用其他格式');
      }
    }
  }
  
  return file;
};

/**
 * 压缩图片到指定大小
 * @param {File} file - 原始图片文件
 * @param {number} maxSizeKB - 最大文件大小（KB）
 * @returns {Promise<File>} 压缩后的文件
 */
export const compressImage = async (file, maxSizeKB = 500) => {
  // 首先转换 HEIC 格式
  const convertedFile = await convertHeicIfNeeded(file);
  
  const options = {
    maxSizeMB: maxSizeKB / 1024, // 转换为MB
    maxWidthOrHeight: 1920, // 最大宽度或高度
    useWebWorker: true, // 使用Web Worker提高性能
    fileType: 'image/jpeg', // 统一输出为JPEG格式
    initialQuality: 0.8 // 初始质量
  };

  try {
    console.log('开始压缩图片:', {
      原始文件名: convertedFile.name,
      原始大小: `${(convertedFile.size / 1024).toFixed(2)}KB`,
      目标大小: `${maxSizeKB}KB`
    });

    const compressedFile = await imageCompression(convertedFile, options);
    
    console.log('图片压缩完成:', {
      压缩后大小: `${(compressedFile.size / 1024).toFixed(2)}KB`,
      压缩比: `${((1 - compressedFile.size / convertedFile.size) * 100).toFixed(1)}%`
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
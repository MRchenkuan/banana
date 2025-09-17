import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { compressImages } from '../utils/imageCompression';
import { getImageFromDragEvent } from '../utils/imageDragUtils';

// 常量配置
const CONFIG = {
  MAX_IMAGES: 2,
  COMPRESSION_THRESHOLD: 500 * 1024, // 500KB
  COMPRESSION_SIZE: 500,
  SUPPORTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  MIME_TO_EXT: {
    'jpeg': 'jpg',
    'png': 'png',
    'gif': 'gif',
    'webp': 'webp',
    'bmp': 'bmp',
    'svg+xml': 'svg'
  }
};

// 错误类型枚举
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  CORS: 'CORS',
  HTTP: 'HTTP',
  VALIDATION: 'VALIDATION',
  COMPRESSION: 'COMPRESSION',
  UNKNOWN: 'UNKNOWN'
};

const useImageHandler = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const loadingMessageRef = useRef(null);

  // 错误分类器
  const classifyError = useCallback((error) => {
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      return ERROR_TYPES.NETWORK;
    }
    if (error.message.includes('CORS')) {
      return ERROR_TYPES.CORS;
    }
    if (error.message.includes('HTTP')) {
      return ERROR_TYPES.HTTP;
    }
    if (error.message.includes('压缩') || error.message.includes('compression')) {
      return ERROR_TYPES.COMPRESSION;
    }
    if (error.message.includes('类型') || error.message.includes('格式')) {
      return ERROR_TYPES.VALIDATION;
    }
    return ERROR_TYPES.UNKNOWN;
  }, []);

  // 错误消息生成器
  const getErrorMessage = useCallback((errorType, error) => {
    const messages = {
      [ERROR_TYPES.NETWORK]: '网络图片加载失败：请检查网络连接或图片链接是否有效',
      [ERROR_TYPES.CORS]: '图片加载失败：该网站不允许跨域访问图片',
      [ERROR_TYPES.HTTP]: `图片加载失败：服务器错误 (${error.message})`,
      [ERROR_TYPES.VALIDATION]: `图片验证失败：${error.message}`,
      [ERROR_TYPES.COMPRESSION]: '图片压缩失败，请重试',
      [ERROR_TYPES.UNKNOWN]: `图片处理失败：${error.message || '未知错误'}`
    };
    return messages[errorType] || messages[ERROR_TYPES.UNKNOWN];
  }, []);

  // 统一的错误处理器
  const handleError = useCallback((error, context = '') => {
    console.error(`图片处理错误 [${context}]:`, error);
    
    // 清理loading状态
    if (loadingMessageRef.current) {
      message.destroy();
      loadingMessageRef.current = null;
    }
    setIsProcessing(false);

    // 根据错误类型显示不同提示
    const errorType = classifyError(error);
    const errorMessage = getErrorMessage(errorType, error);
    message.error(errorMessage);

    // 记录详细错误信息
    console.error('详细错误信息:', {
      error,
      context,
      type: errorType,
      timestamp: new Date().toISOString()
    });
  }, [classifyError, getErrorMessage]);

  // 显示loading状态
  const showLoading = useCallback((text) => {
    if (loadingMessageRef.current) {
      message.destroy();
    }
    loadingMessageRef.current = message.loading(text, 0);
    setIsProcessing(true);
  }, []);

  // 隐藏loading状态
  const hideLoading = useCallback(() => {
    if (loadingMessageRef.current) {
      message.destroy();
      loadingMessageRef.current = null;
    }
    setIsProcessing(false);
  }, []);

  // 验证图片数量限制
  const validateImageCount = useCallback(() => {
    if (selectedImages.length >= CONFIG.MAX_IMAGES) {
      message.warning(`最多只能上传${CONFIG.MAX_IMAGES}张图片`);
      return false;
    }
    return true;
  }, [selectedImages.length]);

  // 生成唯一文件名 - 修复版本
  const generateUniqueFileName = useCallback((url, type, prefix = 'dragged') => {
    try {
      const urlHash = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
      const timestamp = Date.now();
      
      // 根据实际MIME类型确定扩展名，而不是URL
      let extension = 'jpg'; // 默认扩展名
      if (type && type.startsWith('image/')) {
        const mimeExtension = type.split('/')[1];
        if (mimeExtension && CONFIG.MIME_TO_EXT[mimeExtension]) {
          extension = CONFIG.MIME_TO_EXT[mimeExtension];
        } else if (mimeExtension) {
          // 处理未在映射表中的MIME类型
          extension = mimeExtension === 'jpeg' ? 'jpg' : mimeExtension;
        }
      }
      
      return `${prefix}-${urlHash}-${timestamp}.${extension}`;
    } catch (error) {
      // 如果btoa失败，使用时间戳作为备选方案
      const timestamp = Date.now();
      let extension = 'jpg';
      if (type && type.startsWith('image/')) {
        const mimeExtension = type.split('/')[1];
        extension = mimeExtension === 'jpeg' ? 'jpg' : (mimeExtension || 'jpg');
      }
      return `${prefix}-${timestamp}.${extension}`;
    }
  }, []);

  // 验证图片类型
  const validateImageType = useCallback((blob, url) => {
    const isValidMimeType = blob.type.startsWith('image/') || 
                           (blob.type === 'application/octet-stream' && blob.size > 0) ||
                           (blob.type === '' && blob.size > 0); // 处理某些服务器不返回正确MIME类型的情况
    
    if (!isValidMimeType) {
      throw new Error(`检测到无效的图片类型：${blob.type || '未知'}，大小：${blob.size}字节`);
    }

    // 额外的文件扩展名检查
    if (url && !blob.type.startsWith('image/')) {
      const urlLower = url.toLowerCase();
      const hasImageExtension = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].some(ext => 
        urlLower.includes(ext)
      );
      
      if (!hasImageExtension) {
        throw new Error('URL中未检测到有效的图片文件扩展名');
      }
    }

    return true;
  }, []);

  // 压缩图片处理
  const handleImageCompression = useCallback(async (files, successMessage = '图片处理完成') => {
    const needCompression = files.some(file => file.size > CONFIG.COMPRESSION_THRESHOLD);
    
    if (needCompression) {
      showLoading('正在压缩图片...');
      try {
        const compressedFiles = await compressImages(files, CONFIG.COMPRESSION_SIZE);
        setSelectedImages(prev => [...prev, ...compressedFiles]);
        hideLoading();
        message.success(`${successMessage}（已压缩）`);
        return compressedFiles;
      } catch (error) {
        hideLoading();
        throw new Error(`图片压缩失败: ${error.message}`);
      }
    } else {
      setSelectedImages(prev => [...prev, ...files]);
      message.success(successMessage);
      return files;
    }
  }, [showLoading, hideLoading]);

  // 处理Data URL
  const handleDataUrl = useCallback(async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      validateImageType(blob, imageUrl);
      
      const uniqueFileName = generateUniqueFileName(imageUrl, blob.type, 'data');
      const file = new File([blob], uniqueFileName, { type: blob.type });
      
      await handleImageCompression([file], 'Data URL图片加载完成');
    } catch (error) {
      throw new Error(`Data URL处理失败: ${error.message}`);
    }
  }, [validateImageType, generateUniqueFileName, handleImageCompression]);

  // 处理网络URL - 修复版本
  const handleNetworkUrl = useCallback(async (imageUrl) => {
    showLoading('正在加载网络图片...');
    
    try {
      console.log('开始加载网络图片:', imageUrl);
      
      const response = await fetch(imageUrl, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'image/*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('图片blob获取成功:', { type: blob.type, size: blob.size });
      
      validateImageType(blob, imageUrl);
      
      // 确保使用blob的实际类型生成文件名
      const uniqueFileName = generateUniqueFileName(imageUrl, blob.type, 'http');
      const file = new File([blob], uniqueFileName, { type: blob.type });
      
      console.log('文件创建成功:', { name: file.name, type: file.type, size: file.size });
      
      // 确保 blob 完全加载后再添加到状态
      await new Promise(resolve => setTimeout(resolve, 100));
      
      hideLoading();
      await handleImageCompression([file], '网络图片加载完成');
    } catch (error) {
      hideLoading();
      throw error;
    }
  }, [showLoading, hideLoading, validateImageType, generateUniqueFileName, handleImageCompression]);

  // 处理Blob URL
  const handleBlobUrl = useCallback(async (blobUrl) => {
    try {
      console.log('开始处理 blob URL:', blobUrl);
      
      const response = await fetch(blobUrl);
      if (!response.ok) {
        throw new Error(`无法获取 blob 数据: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('blob 数据获取成功:', { type: blob.type, size: blob.size });
      
      validateImageType(blob, blobUrl);
      
      // 为blob URL生成唯一文件名
      const uniqueFileName = generateUniqueFileName(blobUrl, blob.type, 'blob');
      const file = new File([blob], uniqueFileName, { type: blob.type });
      
      console.log('文件创建成功:', { name: file.name, type: file.type, size: file.size });
      
      await handleImageCompression([file], 'Blob图片处理完成');
    } catch (error) {
      throw new Error(`Blob URL处理失败: ${error.message}`);
    }
  }, [validateImageType, generateUniqueFileName, handleImageCompression]);

  // 处理URL拖拽 - 修改版本
  const handleUrlDrop = useCallback(async (imageUrl) => {
    if (!validateImageCount()) return;
    
    try {
      // 处理不同类型的URL
      if (imageUrl.startsWith('data:')) {
        await handleDataUrl(imageUrl);
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        await handleNetworkUrl(imageUrl);
      } else if (imageUrl.startsWith('blob:')) {
        await handleBlobUrl(imageUrl);
      } else {
        console.warn('不支持的图片 URL 类型:', imageUrl);
        message.warning('不支持的图片格式，请上传本地图片文件');
      }
    } catch (error) {
      handleError(error, 'URL拖拽处理');
    }
  }, [validateImageCount, handleDataUrl, handleNetworkUrl, handleBlobUrl, handleError]);

  // 处理文件拖拽
  const handleFileDrop = useCallback(async (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      message.warning('未检测到有效的图片文件');
      return;
    }
    
    if (!validateImageCount()) return;
    
    try {
      const availableSlots = CONFIG.MAX_IMAGES - selectedImages.length;
      const newImages = imageFiles.slice(0, availableSlots);
      
      await handleImageCompression(newImages, '本地图片上传完成');
      
      if (imageFiles.length > availableSlots) {
        message.warning(`最多只能上传${CONFIG.MAX_IMAGES}张图片`);
      }
    } catch (error) {
      handleError(error, '文件拖拽处理');
    }
  }, [validateImageCount, selectedImages.length, handleImageCompression, handleError]);

  // 主拖拽处理函数
  // 添加防重复处理机制
  const [isDropProcessing, setIsDropProcessing] = useState(false);
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // 防止重复处理
    if (isProcessing || isDropProcessing) {
      console.warn('拖拽处理中，跳过重复事件');
      return;
    }
    
    setIsDropProcessing(true);
    
    try {
      // 检查URL拖拽
      const imageUrl = getImageFromDragEvent(e);
      if (imageUrl) {
        await handleUrlDrop(imageUrl);
        return;
      }
      
      // 检查文件拖拽
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        await handleFileDrop(files);
      }
    } finally {
      // 延迟重置，防止快速重复触发
      setTimeout(() => {
        setIsDropProcessing(false);
      }, 100);
    }
  }, [isProcessing, isDropProcessing, handleUrlDrop, handleFileDrop]);

  // 拖拽事件处理
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!isProcessing) {
      setIsDragOver(true);
    }
  }, [isProcessing]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // 工具栏图片上传处理
  const handleToolbarImageUpload = useCallback((imageFiles, shouldClear = true) => {
    if (shouldClear) {
      setSelectedImages([]);
    }
    
    const newImages = imageFiles.slice(0, CONFIG.MAX_IMAGES);
    setSelectedImages(newImages);
    
    if (imageFiles.length > CONFIG.MAX_IMAGES) {
      message.warning(`最多只能上传${CONFIG.MAX_IMAGES}张图片`);
    }
  }, []);

  // 移除图片
  const removeImage = useCallback((index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 清空所有图片
  const clearImages = useCallback(() => {
    setSelectedImages([]);
  }, []);

  return {
    // 状态
    selectedImages,
    isDragOver,
    isProcessing,
    
    // 设置器
    setSelectedImages,
    
    // 事件处理器
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToolbarImageUpload,
    
    // 工具方法
    removeImage,
    clearImages,
    
    // 配置
    config: CONFIG
  };
};

export default useImageHandler;
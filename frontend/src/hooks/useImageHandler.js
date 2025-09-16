import { useState } from 'react';
import { message } from 'antd';
import { compressImages } from '../utils/imageCompression';
import { getImageFromDragEvent } from '../utils/imageDragUtils';

const useImageHandler = () => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    // 检查是否是图片URL拖拽 - 使用工具函数
    const imageUrl = getImageFromDragEvent(e);
    if (imageUrl) {
      try {
        if (selectedImages.length >= 2) {
          message.warning('最多只能上传2张图片');
          return;
        }
        
        // 检查是否是 blob URL
        if (imageUrl.startsWith('blob:')) {
          console.warn('检测到 blob URL 拖拽，跳过处理:', imageUrl);
          message.warning('无法处理已处理过的图片，请重新上传原始图片');
          return;
        }
        
        // 检查是否是 data URL
        if (imageUrl.startsWith('data:')) {
          try {
            // 处理 data URL
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            // 生成唯一的文件名
            const urlHash = btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
            const timestamp = Date.now();
            const extension = blob.type.split('/')[1] || 'png';
            const uniqueFileName = `dragged-data-${urlHash}-${timestamp}.${extension}`;
            
            const file = new File([blob], uniqueFileName, { type: blob.type });
            
            // 检查是否需要压缩
            const needCompression = file.size > 500 * 1024;
            
            if (needCompression) {
              message.loading('正在压缩图片...', 0);
              const compressedFiles = await compressImages([file], 500);
              setSelectedImages(prev => [...prev, ...compressedFiles]);
              message.destroy();
              message.success('图片压缩完成');
            } else {
              setSelectedImages(prev => [...prev, file]);
            }
            return;
          } catch (error) {
            console.error('处理 data URL 失败:', error);
            message.error('图片处理失败，请重试');
            return;
          }
        }
        
        // 处理普通 HTTP/HTTPS URL
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // 显示加载状态
          message.loading('正在加载网络图片...', 0);
          
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // 验证是否为图片类型
          if (!blob.type.startsWith('image/')) {
            message.destroy();
            message.error('拖拽的不是有效的图片文件');
            return;
          }
          
          // 生成唯一的文件名
          const urlHash = btoa(imageUrl).replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
          const timestamp = Date.now();
          const extension = blob.type.split('/')[1] || 'png';
          const uniqueFileName = `dragged-http-${urlHash}-${timestamp}.${extension}`;
          
          const file = new File([blob], uniqueFileName, { type: blob.type });
          
          // 确保 blob 完全加载后再添加到状态
          await new Promise(resolve => setTimeout(resolve, 100));
          
          message.destroy();
          
          // 检查是否需要压缩
          const needCompression = file.size > 500 * 1024;
          
          if (needCompression) {
            message.loading('正在压缩图片...', 0);
            const compressedFiles = await compressImages([file], 500);
            setSelectedImages(prev => [...prev, ...compressedFiles]);
            message.destroy();
            message.success('图片加载并压缩完成');
          } else {
            setSelectedImages(prev => [...prev, file]);
            message.success('图片加载完成');
          }
          return;
        }
        
        // 其他类型的 URL
        console.warn('不支持的图片 URL 类型:', imageUrl);
        message.warning('不支持的图片格式，请上传本地图片文件');
        return;
        
      } catch (error) {
        console.error('处理拖拽图片失败:', error);
        message.error('图片处理失败，请重试');
        return;
      }
    }
    
    // 处理文件拖拽
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      if (selectedImages.length >= 3) {
        message.warning('最多只能上传3张图片');
        return;
      }
      
      const newImages = imageFiles.slice(0, 3 - selectedImages.length);
      
      const needCompression = newImages.some(file => file.size > 500 * 1024);
      
      if (needCompression) {
        try {
          message.loading('正在压缩图片...', 0);
          const compressedFiles = await compressImages(newImages, 500);
          setSelectedImages(prev => [...prev, ...compressedFiles]);
          message.destroy();
          message.success('图片压缩完成');
        } catch (error) {
          message.destroy();
          message.error('图片压缩失败');
          console.error('压缩失败:', error);
        }
      } else {
        setSelectedImages(prev => [...prev, ...newImages]);
      }
      
      if (imageFiles.length > 3 - selectedImages.length) {
        message.warning('最多只能上传3张图片');
      }
    }
  };

  const handleToolbarImageUpload = (imageFiles, shouldClear = true) => {
    if (shouldClear) {
      setSelectedImages([]);
    }
    
    const newImages = imageFiles.slice(0, 3);
    setSelectedImages(newImages);
    
    if (imageFiles.length > 3) {
      message.warning('最多只能上传3张图片');
    }
  };

  return {
    selectedImages,
    setSelectedImages,
    isDragOver,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleToolbarImageUpload
  };
};

export default useImageHandler;
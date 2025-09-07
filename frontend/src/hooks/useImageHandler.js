import { useState } from 'react';
import { message } from 'antd';
import { compressImages } from '../utils/imageCompression';

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
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const newImages = imageFiles.slice(0, 4 - selectedImages.length);
      
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
        }
      } else {
        setSelectedImages(prev => [...prev, ...newImages]);
      }
      
      if (imageFiles.length > 4 - selectedImages.length) {
        message.warning('最多只能上传4张图片');
      }
    }
  };

  const handleToolbarImageUpload = (imageFiles, shouldClear = true) => {
    if (shouldClear) {
      setSelectedImages([]);
    }
    
    const newImages = imageFiles.slice(0, 4);
    setSelectedImages(newImages);
    
    if (imageFiles.length > 4) {
      message.warning('最多只能上传4张图片');
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
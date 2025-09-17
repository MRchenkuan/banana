import React, { useState, useCallback, useMemo } from 'react';
import {
  Input,
  Button,
  Upload,
  Image,
  Typography,
  message,
  Progress
} from 'antd';
import {
  SendOutlined,
  PictureOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { compressImages } from '../../utils/imageCompression';
import { useImageUrls } from '../../hooks/useImageUrls';
import AIToolbar from '../AIToolbar/AIToolbar';
import styles from './MessageInput.module.css';

const { TextArea } = Input;
const { Text } = Typography;

// 常量配置
const IMAGE_CONFIG = {
  MAX_IMAGES: 2,
  COMPRESSION_THRESHOLD: 500 * 1024, // 500KB
  COMPRESSION_SIZE: 600 // 600KB
};

const MessageInput = ({
  inputValue,
  setInputValue,
  selectedImages,
  setSelectedImages,
  loading,
  isDragOver,
  onSendMessage,
  onKeyPress,
  onDragOver,
  onDragLeave,
  onDrop,
  onPaste,
  onToolClick,
  onImageUpload
}) => {
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  
  const { imageUrls, urlsReady } = useImageUrls(selectedImages);
  
  // 计算派生状态
  const derivedState = useMemo(() => ({
    isMaxImages: selectedImages.length >= IMAGE_CONFIG.MAX_IMAGES,
    canSend: (inputValue.trim() || selectedImages.length > 0) && !compressing,
    placeholder: isDragOver ? "松开鼠标上传图片..." : "输入消息、拖拽图片或粘贴图片到此处..."
  }), [selectedImages.length, inputValue, compressing, isDragOver]);
  
  // 图片操作函数
  const imageOperations = {
    remove: useCallback((index) => {
      setSelectedImages(prev => prev.filter((_, i) => i !== index));
    }, [setSelectedImages]),
    
    clearAll: useCallback(() => {
      setSelectedImages([]);
    }, [setSelectedImages]),
    
    validate: useCallback((files) => {
      const validFiles = files.filter(file => {
        const isImage = file.type?.startsWith('image/');
        if (!isImage) {
          message.error(`${file.name} 不是图片文件`);
        }
        return isImage;
      });
      
      if (validFiles.length === 0) return null;
      
      if (validFiles.length > IMAGE_CONFIG.MAX_IMAGES) {
        message.warning(`最多只能上传${IMAGE_CONFIG.MAX_IMAGES}张图片`);
        return validFiles.slice(0, IMAGE_CONFIG.MAX_IMAGES);
      }
      
      return validFiles;
    }, []),
    
    compress: useCallback(async (files) => {
      const needCompression = files.some(file => file.size > IMAGE_CONFIG.COMPRESSION_THRESHOLD);
      
      if (!needCompression) {
        return files;
      }
      
      setCompressing(true);
      setCompressionProgress(0);
      
      try {
        const compressedFiles = await compressImages(
          files,
          IMAGE_CONFIG.COMPRESSION_SIZE,
          (current, total) => {
            setCompressionProgress(Math.round((current / total) * 100));
          }
        );
        
        message.success('图片压缩完成');
        return compressedFiles;
      } catch (error) {
        message.error(error.message || '图片压缩失败');
        throw error;
      } finally {
        setCompressing(false);
        setCompressionProgress(0);
      }
    }, [])
  };
  
  // 处理图片上传
  const handleImageUpload = useCallback(async (info) => {
    const { fileList } = info;
    const files = fileList.map(file => file.originFileObj);
    
    const validFiles = imageOperations.validate(files);
    if (!validFiles) return;
    
    try {
      const processedFiles = await imageOperations.compress(validFiles);
      setSelectedImages(processedFiles);
    } catch (error) {
      // 错误已在compress函数中处理
    }
  }, [imageOperations, setSelectedImages]);
  
  // 渲染单个图片预览
  const renderImagePreview = useCallback((image, index) => {
    const fileKey = `${image.name}-${image.size}-${image.lastModified}`;
    const imageUrl = imageUrls[index];
    
    if (!imageUrl || !urlsReady) {
      return (
        <div key={fileKey} className={styles.loadingPlaceholder}>
          <div className={styles.loadingContent}>
            加载中...
          </div>
        </div>
      );
    }
    
    return (
      <div key={fileKey} className={styles.imagePreview}>
        <div className={styles.imageWrapper}>
          <img
            src={imageUrl}
            alt={`预览 ${index + 1}`}
            className={styles.imagePreviewImg}
            onError={(e) => {
              console.error('图片预览加载失败:', imageUrl);
              e.target.style.display = 'none';
            }}
            onLoad={(e) => {
              e.target.style.opacity = '1';
            }}
          />
        </div>
        <Button
          type="primary"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => imageOperations.remove(index)}
          className={styles.deleteButton}
        />
      </div>
    );
  }, [imageUrls, urlsReady, imageOperations.remove]);
  
  // 处理粘贴事件
  const handlePaste = useCallback(async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles = [];
    let hasImage = false;
    let hasText = false;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          const renamedFile = new File(
            [file],
            `pasted-image-${Date.now()}.${item.type.split('/')[1]}`,
            {
              type: item.type,
              lastModified: Date.now()
            }
          );
          imageFiles.push(renamedFile);
        }
      } else if (item.type === 'text/plain') {
        hasText = true;
      }
    }
    
    if (hasImage && !hasText) {
      e.preventDefault();
    }
    
    if (imageFiles.length > 0 && onPaste) {
      await onPaste(imageFiles);
    }
  }, [onPaste]);
  
  return (
    <div
      className={`${styles.container} ${isDragOver ? styles.containerDragOver : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <AIToolbar
        onToolClick={onToolClick}
        onImageUpload={onImageUpload}
        setInputValue={setInputValue}
        inputValue={inputValue}
        selectedImages={selectedImages}
      />
      
      {/* 压缩进度提示 */}
      {compressing && (
        <div className={styles.compressionProgress}>
          <Text className={styles.compressionText}>
            {compressionProgress === 0 ? '正在处理图片格式...' : '正在压缩图片...'}
          </Text>
          <Progress percent={compressionProgress} size="small" />
        </div>
      )}
      
      {/* 多图片预览区域 */}
      {selectedImages.length > 0 && (
        <div className={styles.imagePreviewSection}>
          <div className={styles.imagePreviewHeader}>
            <Text className={styles.imageCountText}>
              已选择 {selectedImages.length} 张图片
            </Text>
            <Button 
              type="link" 
              size="small" 
              onClick={imageOperations.clearAll} 
              className={styles.clearAllButton}
            >
              清空全部
            </Button>
          </div>
          <div className={styles.imagePreviewGrid}>
            {selectedImages.map(renderImagePreview)}
          </div>
        </div>
      )}
      
      {/* 输入框区域 */}
      <div className={styles.inputArea}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyPress}
          onPaste={handlePaste}
          placeholder={derivedState.placeholder}
          autoSize={{ minRows: 3, maxRows: 4 }}
          className={`${styles.textArea} ${isDragOver ? styles.textAreaDragOver : ''}`}
        />
        
        {/* 右下角按钮组 */}
        <div className={styles.buttonGroup}>
          <Upload
            multiple
            accept="image/*"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleImageUpload}
            disabled={derivedState.isMaxImages || compressing}
          >
            <Button 
              size="small"
              icon={<PictureOutlined />} 
              disabled={derivedState.isMaxImages || compressing}
              loading={compressing}
              title={derivedState.isMaxImages ? `最多上传${IMAGE_CONFIG.MAX_IMAGES}张图片` : "上传图片"}
              className={styles.uploadButton}
            />
          </Upload>
          
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={onSendMessage}
            loading={loading}
            disabled={!derivedState.canSend}
            className={styles.sendButton}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
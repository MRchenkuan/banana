import React, { useState, useCallback } from 'react';
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
import { compressImages } from '../utils/imageCompression';
import { useImageUrls } from '../hooks/useImageUrls';

const { TextArea } = Input;
const { Text } = Typography;

// 在 MessageInput 组件中添加粘贴事件处理
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
  onPaste // 新增粘贴事件处理器
}) => {
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  
  // 使用自定义Hook管理图片URL
  const imageUrls = useImageUrls(selectedImages);
  
  const removeImage = useCallback((index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  }, [setSelectedImages]);
  
  const clearAllImages = useCallback(() => {
    setSelectedImages([]);
  }, [setSelectedImages]);

  const handleImageUpload = async (info) => {
    const { fileList } = info;
    const validFiles = fileList.filter(file => {
      const isImage = file.type?.startsWith('image/');
      if (!isImage) {
        message.error(`${file.name} 不是图片文件`);
      }
      return isImage;
    }).slice(0, 4).map(file => file.originFileObj);
    
    if (validFiles.length === 0) return;
    if (validFiles.length > 2) {
      message.warning('最多只能上传2张图片');
      return;
    }
    
    // 检查是否需要压缩
    const needCompression = validFiles.some(file => file.size > 500 * 1024);
    
    if (needCompression) {
      setCompressing(true);
      setCompressionProgress(0);
      
      try {
        const compressedFiles = await compressImages(
          validFiles, 
          900, 
          (current, total) => {
            setCompressionProgress(Math.round((current / total) * 100));
          }
        );
        
        setSelectedImages(compressedFiles);
        message.success('图片压缩完成');
      } catch (error) {
        message.error(error.message || '图片压缩失败');
      } finally {
        setCompressing(false);
        setCompressionProgress(0);
      }
    } else {
      setSelectedImages(validFiles);
    }
    
    if (fileList.length > 4) {
      message.warning('最多只能上传4张图片');
    }
  };
  
  // 渲染图片预览
  const renderImagePreviews = () => {
    return selectedImages.map((image, index) => {
      const fileKey = `${image.name}-${image.size}-${image.lastModified}`;
      const imageUrl = imageUrls[index];
      
      // 确保 URL 存在才渲染
      if (!imageUrl) {
        return (
          <div key={fileKey} style={{ position: 'relative' }}>
            <div 
              style={{
                width: 60,
                height: 60,
                backgroundColor: '#f5f5f5',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999'
              }}
            >
              加载中...
            </div>
          </div>
        );
      }
      
      return (
        <div key={fileKey} style={{ position: 'relative' }}>
          <Image
            src={imageUrl}
            alt={`预览 ${index + 1}`}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: '6px' }}
            onError={() => {
              console.error('图片预览加载失败:', imageUrl);
            }}
          />
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => removeImage(index)}
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </div>
      );
    });
  };

  // 处理粘贴事件
  const handlePaste = async (e) => {
    // 检查是否有图片数据
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const imageFiles = [];
    
    // 遍历剪贴板项目
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // 检查是否为图片类型
      if (item.type.startsWith('image/')) {
        e.preventDefault(); // 阻止默认粘贴行为
        
        const file = item.getAsFile();
        if (file) {
          // 重命名文件
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
      }
    }
    
    // 如果有图片文件，调用父组件的粘贴处理器
    if (imageFiles.length > 0 && onPaste) {
      await onPaste(imageFiles);
    }
  };
  
  return (
    <div
      style={{
        margin: '0 24px 24px',
        backgroundColor: '#1f1f1f',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        padding: '16px',
        boxSizing: 'border-box',
        border: isDragOver ? '2px dashed #1890ff' : '2px solid #434343',
        position: 'relative'
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 压缩进度提示 */}
      {compressing && (
        <div style={{ marginBottom: '12px' }}>
          <Text style={{ fontSize: '12px', color: '#a6a6a6' }}>正在压缩图片...</Text>
          <Progress percent={compressionProgress} size="small" />
        </div>
      )}
      
      {/* 多图片预览区域 */}
      {selectedImages.length > 0 && (
        <div style={{ marginBottom: '12px', position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text style={{ fontSize: '12px', color: '#a6a6a6' }}>已选择 {selectedImages.length} 张图片</Text>
            <Button type="link" size="small" onClick={clearAllImages} style={{ padding: 0, height: 'auto', color: '#1890ff' }}>
              清空全部
            </Button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {renderImagePreviews()}
          </div>
        </div>
      )}
      
      {/* 输入框区域 */}
      <div style={{ 
        position: 'relative',
        borderRadius: '8px',
        padding: '2px',
        zIndex: 2
      }}>
        <TextArea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyPress}
          onPaste={handlePaste} // 添加粘贴事件处理
          placeholder={(isDragOver ? "松开鼠标上传图片..." : "输入消息、拖拽图片或粘贴图片到此处...")}
          autoSize={{ minRows: 3, maxRows: 4 }}
          style={{ 
            width: '100%',
            paddingRight: '80px',
            backgroundColor: isDragOver ? 'rgba(24, 144, 255, 0.1)' : '#262626',
            color: '#ffffff',
            opacity: 1,
            border: 'none',
            borderRadius: '6px'
          }}
        />
        
        {/* 右下角按钮组 */}
        <div style={{ 
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          display: 'flex',
          gap: '6px',
          opacity: 1,
          zIndex: 3
        }}>
          <Upload
            multiple
            accept="image/*"
            showUploadList={false}
            beforeUpload={() => false}
            onChange={handleImageUpload}
            disabled={selectedImages.length >= 2 || compressing}
          >
            <Button 
              size="small"
              icon={<PictureOutlined />} 
              disabled={selectedImages.length >= 2 || compressing}
              loading={compressing}
              title={selectedImages.length >= 2 ? "最多上传4张图片" : "上传图片"}
              style={{ 
                opacity: 1,
                backgroundColor: '#434343',
                borderColor: '#595959',
                color: '#ffffff'
              }}
            />
          </Upload>
          
          <Button
            type="primary"
            size="small"
            icon={<SendOutlined />}
            onClick={onSendMessage}
            loading={loading}
            disabled={!inputValue.trim() && selectedImages.length === 0 || compressing}
            style={{ opacity: 1 }}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
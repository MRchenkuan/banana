import { useMemo, useEffect, useRef, useState } from 'react';

export const useImageUrls = (images) => {
  const urlCacheRef = useRef(new Map());
  const [urlsReady, setUrlsReady] = useState(false);
  
  const imageUrls = useMemo(() => {
    const cache = urlCacheRef.current;
    
    const urls = images.map(image => {
      // 如果已经是字符串URL（http/https/blob），直接返回
      if (typeof image === 'string') {
        return image;
      }
      
      // 如果是File对象，才进行blob URL转换
      if (image instanceof File) {
        // 使用文件的唯一标识作为缓存key
        const fileKey = `${image.name}-${image.size}-${image.lastModified}`;
        
        if (!cache.has(fileKey)) {
          try {
            const url = URL.createObjectURL(image);
            cache.set(fileKey, url);
          } catch (error) {
            console.error('创建图片URL失败:', error);
            return null;
          }
        }
        
        return cache.get(fileKey);
      }
      
      // 其他情况，可能是包含src属性的对象
      if (image && image.src) {
        return image.src;
      }
      
      console.warn('未知的图片类型:', image);
      return null;
    }).filter(Boolean);
    
    // 延迟设置URL就绪状态，确保DOM渲染完成
    setTimeout(() => setUrlsReady(true), 0);
    
    return urls;
  }, [images]);
  
  useEffect(() => {
    return () => {
      // 只清理File对象生成的blob URL
      const currentFileKeys = new Set(
        images
          .filter(img => img instanceof File)
          .map(img => `${img.name}-${img.size}-${img.lastModified}`)
      );
      
      const cache = urlCacheRef.current;
      for (const [key, url] of cache.entries()) {
        if (!currentFileKeys.has(key)) {
          URL.revokeObjectURL(url);
          cache.delete(key);
        }
      }
    };
  }, [images]);
  
  return { imageUrls, urlsReady };
};
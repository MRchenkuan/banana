import { useMemo, useEffect, useRef } from 'react';

export const useImageUrls = (images) => {
  const urlCacheRef = useRef(new Map());
  
  const imageUrls = useMemo(() => {
    const cache = urlCacheRef.current;
    
    return images.map(image => {
      // 如果已经是字符串URL（http/https/blob），直接返回
      if (typeof image === 'string') {
        return image;
      }
      
      // 如果是File对象，才进行blob URL转换
      if (image instanceof File) {
        // 使用文件的唯一标识作为缓存key
        const fileKey = `${image.name}-${image.size}-${image.lastModified}`;
        
        if (!cache.has(fileKey)) {
          cache.set(fileKey, URL.createObjectURL(image));
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
  
  return imageUrls;
};
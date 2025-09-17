import { useMemo, useEffect, useRef, useState } from 'react';

// 完全重写useImageUrls，使用更安全的缓存策略
export const useImageUrls = (images) => {
  const urlCacheRef = useRef(new Map());
  const [urlsReady, setUrlsReady] = useState(false);
  const activeUrlsRef = useRef(new Set());
  
  const imageUrls = useMemo(() => {
    const cache = urlCacheRef.current;
    const newActiveUrls = new Set();
    
    const urls = images.map((image, index) => {
      // 如果已经是字符串URL，直接返回
      if (typeof image === 'string') {
        newActiveUrls.add(image);
        return image;
      }
      
      // 生成稳定的fileKey（与MessageInput保持一致）
      const fileKey = `${image.name || 'unknown'}-${image.size || 0}-${image.lastModified || 0}-${index}`;
      
      if (!cache.has(fileKey)) {
        try {
          const url = URL.createObjectURL(image);
          cache.set(fileKey, url);
          console.log('创建新blob URL:', url, 'for key:', fileKey);
        } catch (error) {
          console.error('创建图片URL失败:', error);
          return null;
        }
      }
      
      const url = cache.get(fileKey);
      newActiveUrls.add(url);
      return url;
    }).filter(Boolean);
    
    // 更新活跃URL集合
    activeUrlsRef.current = newActiveUrls;
    
    // 延迟设置URL就绪状态
    setTimeout(() => setUrlsReady(true), 0);
    
    return urls;
  }, [images]);
  
  // 组件卸载时才清理所有URL
  useEffect(() => {
    return () => {
      console.log('组件卸载，清理所有blob URLs');
      const cache = urlCacheRef.current;
      for (const [key, url] of cache.entries()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
      cache.clear();
    };
  }, []); // 空依赖数组，只在组件卸载时执行
  
  return { imageUrls, urlsReady };
};
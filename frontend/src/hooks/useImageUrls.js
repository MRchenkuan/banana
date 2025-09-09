import { useMemo, useEffect } from 'react';

export const useImageUrls = (images) => {
  const imageUrls = useMemo(() => {
    return images.map(image => URL.createObjectURL(image));
  }, [images]);
  
  useEffect(() => {
    return () => {
      imageUrls.forEach(url => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imageUrls]);
  
  return imageUrls;
};
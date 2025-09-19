import React from 'react';
import { optimizeImage } from '../../utils/imageOptimizer';

const ImageGallery = () => {
  const originalImages = [
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-05.webp',
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-01.webp',
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-02.webp', 
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-03.webp',
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-04.webp',
    'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-06.webp'
  ];

  // 优化图片
  const galleryImages = originalImages.map(img => optimizeImage(img, 'gallery'));

  const galleryStyle = {
    display: 'flex',
    width: '100%',
    height: '400px',
    background: 'rgba(255, 255, 255, 0.95)'
  };

  const galleryItemStyle = {
    flex: 1,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };

  return (
    <div style={galleryStyle}>
      {galleryImages.map((image, index) => (
        <div 
          key={index}
          style={{
            ...galleryItemStyle,
            backgroundImage: `url(${image})`,
            borderTop: '1px solid #fff'
          }}
        />
      ))}
    </div>
  );
};

export default ImageGallery;
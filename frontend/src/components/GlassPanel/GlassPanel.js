import React from 'react';
import styles from './GlassPanel.module.css';

const GlassPanel = ({ 
  children, 
  className = '', 
  blur = 20,
  opacity = 0.1,
  gradientIntensity = 'medium',
  shadow = false,
  borderRadius = 12,
  noAnimation = false,
  transparent = false,  // 新增：是否完全透明
  colored = true,       // 新增：是否带背景色
  ...props 
}) => {
  const gradientClass = styles[`gradient-${gradientIntensity}`] || styles['gradient-medium'];
  const shadowClass = shadow ? styles.withShadow : '';
  const animationClass = noAnimation ? styles.noAnimation : '';
  const transparentClass = transparent ? styles.transparent : '';
  const coloredClass = colored ? '' : styles.noColored;
  
  const style = {
    '--blur-amount': transparent ? '2px' : `${blur}px`,  // 透明模式使用最小blur
    '--bg-opacity': transparent ? 0 : opacity,           // 透明模式背景完全透明
    '--border-radius': `${borderRadius}px`,
    ...props.style
  };
  
  return (
    <div 
      className={`${styles.glassPanel} ${gradientClass} ${shadowClass} ${animationClass} ${transparentClass} ${coloredClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
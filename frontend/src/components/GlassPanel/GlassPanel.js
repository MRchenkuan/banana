import React, { useRef, useEffect, useState, forwardRef } from 'react';
import styles from './GlassPanel.module.css';

const GlassPanel = forwardRef(({ 
  children, 
  className = '', 
  blur = 20,
  opacity = 0.1,
  gradientIntensity = 'medium',
  shadow = false,
  borderRadius = 12,
  noAnimation = false,
  transparent = false,
  colored = true,
  ...props 
}, ref) => {
  const internalRef = useRef(null);
  const panelRef = ref || internalRef;
  const [pseudoSize, setPseudoSize] = useState({ width: 0, height: 0 });
  
  // 计算伪类尺寸的函数
  const calculatePseudoSize = () => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    const { width, height } = rect;
    
    // 计算对角线长度，确保旋转时完全覆盖
    const diagonal = Math.sqrt(width * width + height * height);
    
    // 添加一些余量确保完全覆盖
    const safeSize = Math.ceil(diagonal * 1.2);
    
    setPseudoSize({
      width: `${safeSize}px`,
      height: `${safeSize}px`
    });
  };
  
  // 使用ResizeObserver监听尺寸变化
  useEffect(() => {
    if (!panelRef.current) return;
    
    // 初始计算
    calculatePseudoSize();
    
    //创建ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // 使用requestAnimationFrame确保DOM更新完成后再计算
        requestAnimationFrame(() => {
          calculatePseudoSize();
        });
      }
    });
    
    // 开始观察
    resizeObserver.observe(panelRef.current);
    
    // 清理函数
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // 组件重新挂载时重新计算
  useEffect(() => {
    // 使用setTimeout确保组件完全渲染后再计算
    const timer = setTimeout(() => {
      calculatePseudoSize();
    }, 0);
    
    return () => clearTimeout(timer);
  }, [children]); // 当children变化时重新计算
  
  const gradientClass = styles[`gradient-${gradientIntensity}`] || styles['gradient-medium'];
  const shadowClass = shadow ? styles.withShadow : '';
  const animationClass = noAnimation ? styles.noAnimation : '';
  const transparentClass = transparent ? styles.transparent : '';
  const coloredClass = colored ? '' : styles.noColored;
  
  const style = {
    '--blur-amount': transparent ? '2px' : `${blur}px`,
    '--bg-opacity': transparent ? 0 : opacity,
    '--border-radius': `${borderRadius}px`,
    '--pseudo-width': pseudoSize.width,
    '--pseudo-height': pseudoSize.height,
    ...props.style
  };
  
  return (
    <div 
      ref={panelRef}
      className={`${styles.glassPanel} ${gradientClass} ${shadowClass} ${animationClass} ${transparentClass} ${coloredClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

GlassPanel.displayName = 'GlassPanel';

export default GlassPanel;
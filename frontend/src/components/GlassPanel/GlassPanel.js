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
  const [isInitialized, setIsInitialized] = useState(false);
  const resizeTimeoutRef = useRef(null);
  
  // 计算伪类尺寸的函数
  const calculatePseudoSize = () => {
    if (!panelRef.current) return;
    
    const rect = panelRef.current.getBoundingClientRect();
    const { width, height } = rect;
    
    // 忽略无效的尺寸
    if (width === 0 || height === 0) return;
    
    // 计算对角线长度，确保旋转时完全覆盖
    const diagonal = Math.sqrt(width * width + height * height);
    
    // 增加余量确保完全覆盖
    const safeSize = Math.ceil(diagonal * 1.5);
    
    const newSize = {
      width: `${safeSize}px`,
      height: `${safeSize}px`
    };
    
    // 只有当尺寸真正变化时才更新
    if (newSize.width !== pseudoSize.width || newSize.height !== pseudoSize.height) {
      setPseudoSize(newSize);
      
      // 强制更新CSS变量
      if (panelRef.current) {
        const element = panelRef.current;
        element.style.setProperty('--pseudo-width', newSize.width);
        element.style.setProperty('--pseudo-height', newSize.height);
      }
    }
  };
  
  // 使用防抖处理尺寸计算
  const debouncedCalculate = () => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      calculatePseudoSize();
    }, 100);
  };
  
  // 监听尺寸变化
  useEffect(() => {
    if (!panelRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      // 使用防抖函数处理尺寸变化
      debouncedCalculate();
    });
    
    observer.observe(panelRef.current);
    
    // 初始计算
    const initTimer = setTimeout(() => {
      calculatePseudoSize();
      setIsInitialized(true);
    }, 300); // 等待 Modal 动画完成
    
    return () => {
      observer.disconnect();
      clearTimeout(initTimer);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);
  
  // 当内容变化时重新计算
  useEffect(() => {
    if (isInitialized) {
      debouncedCalculate();
    }
  }, [children]);
  
  // 监听可见性变化
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          debouncedCalculate();
        }
      });
    });
    
    if (panelRef.current) {
      observer.observe(panelRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
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
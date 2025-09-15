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
  ...props 
}) => {
  const gradientClass = styles[`gradient-${gradientIntensity}`] || styles['gradient-medium'];
  const shadowClass = shadow ? styles.withShadow : '';
  const animationClass = noAnimation ? styles.noAnimation : '';
  
  const style = {
    '--blur-amount': `${blur}px`,
    '--bg-opacity': opacity,
    '--border-radius': `${borderRadius}px`,
    ...props.style
  };
  
  return (
    <div 
      className={`${styles.glassPanel} ${gradientClass} ${shadowClass} ${animationClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};

export default GlassPanel;
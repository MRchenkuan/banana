// 主题色配置
export const theme = {
  // 主色调
  primary: '#10b981',
  primaryHover: '#34d399',
  primaryActive: '#059669',
  
  // 用户消息色调
  userMessage: '#059669',
  userMessageBorder: '#047857',
  
  // 思考状态色调
  thinking: '#10b981',
  thinkingBackground: '#065f46',
  
  // 阴影色
  primaryShadow: 'rgba(16, 185, 129, 0.3)',
  primaryShadowHover: 'rgba(16, 185, 129, 0.4)',
  
  // 背景色
  dark: '#141414',
  darkSecondary: '#1f1f1f',
  darkTertiary: '#262626',
  
  // 边框色
  border: '#434343',
  borderLight: '#2a2a2a',
  
  // 文本色
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.6)',
};

// 主题工具函数
export const getThemeColor = (colorKey) => {
  return theme[colorKey] || colorKey;
};

// 预设主题方案
export const themePresets = {
  blue: {
    primary: '#1890ff',
    primaryHover: '#40a9ff',
    userMessage: '#3b82f6',
    userMessageBorder: '#2563eb',
    thinking: '#1890ff',
    primaryShadow: 'rgba(24, 144, 255, 0.3)',
    primaryShadowHover: 'rgba(24, 144, 255, 0.4)',
  },
  orange: {
    primary: '#d97706',
    primaryHover: '#f59e0b',
    userMessage: '#d97706',
    userMessageBorder: '#b45309',
    thinking: '#d97706',
    primaryShadow: 'rgba(217, 119, 6, 0.3)',
    primaryShadowHover: 'rgba(217, 119, 6, 0.4)',
  },
  green: {
    primary: '#10b981',
    primaryHover: '#34d399',
    userMessage: '#059669',
    userMessageBorder: '#047857',
    thinking: '#10b981',
    primaryShadow: 'rgba(16, 185, 129, 0.3)',
    primaryShadowHover: 'rgba(16, 185, 129, 0.4)',
  }
};

// 增强的切换主题函数
export const switchTheme = (presetName) => {
  const preset = themePresets[presetName];
  if (preset) {
    // 更新主题对象
    Object.assign(theme, preset);
    
    // 更新 CSS 变量
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', preset.primary);
    root.style.setProperty('--theme-user-message', preset.userMessage);
    root.style.setProperty('--theme-thinking-bg', preset.thinking.replace('#10b981', '#064e3b'));
    
    // 添加主题类名
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${presetName}`);
    
    // 触发重新渲染（如果需要）
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: presetName }));
    
    console.log(`主题已切换到: ${presetName}`);
    return true;
  }
  console.warn(`未找到主题预设: ${presetName}`);
  return false;
};
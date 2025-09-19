import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DesktopOutlined, MobileOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import GlassPanel from '../GlassPanel';
import MobileTypewriter from './MobileTypewriter';
import styles from './MobileWarning.module.css';

const MobileWarning = () => {
  const [copied, setCopied] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showToast, setShowToast] = useState(false);
  
  const domain = "smartidea.top";
  
  // 橱窗图片和打字机文案
  const showcaseItems = [
    {
      image: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-02.webp',
      text: '“让上图人物手握一瓶牛奶倒给下图人物...”'
    },
    {
      image: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-03.webp',
      text: '“将图中漫画人物转换为一张 3D 真实手办，写实风格，真实环境...”'
    },
    {
      image: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-04.webp',
      text: '“将我的这张办公室照片修改为星际空间站的效果，我的老板...”'
    },
    {
      image: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-05.webp',
      text: '“把我的照片制作成一张 4 格漫画，剧情大致是...”'
    },
    {
      image: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/sample-06.webp',
      text: '“按照我俩照片绘制1/7比例的商业化手办，写实风格，真实环...”'
    }
  ];

  // 处理打字完成事件
  const handleTypewriterComplete = () => {
    setCurrentSlide((prev) => (prev + 1) % showcaseItems.length);
  };

  const handleCopyDomain = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(domain);
        // 不再使用 message 组件，改用自定义弹窗
        // message.success('域名已复制到剪贴板');
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = domain;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          // 不再使用 message 组件，改用自定义弹窗
          // message.success('域名已复制到剪贴板');
        } catch (err) {
          console.error('复制失败:', err);
          message.error('复制失败，请手动复制域名');
          return;
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      // 显示复制成功状态
      setCopied(true);
      
      // 显示自定义弹窗
      setShowToast(true);
      
      // 3秒后隐藏弹窗和复制图标
      setTimeout(() => {
        setShowToast(false);
        setCopied(false);
      }, 3000);
      
    } catch (err) {
      console.error('复制域名失败:', err);
      message.error('复制失败，请手动复制域名');
    }
  };

  return (
    <div className={styles.mobileWarningOverlay}>
      {/* 图片橱窗 */}
      <div className={styles.showcaseContainer}>
        <div className={styles.showcaseSlide}>
          <div 
            className={styles.showcaseImage} 
            style={{ 
              backgroundImage: `url(${showcaseItems[currentSlide].image})`,
              animation: 'fadeTransition 0.8s ease forwards'
            }}
            key={currentSlide}
          ></div>
          <div className={styles.showcaseDescription}>
            <MobileTypewriter 
              text={showcaseItems[currentSlide].text} 
              onComplete={handleTypewriterComplete}
            />
          </div>
        </div>
      </div>
      
      <GlassPanel 
        className={styles.warningPanel}
        gradientIntensity="high"
        shadow={true}
        borderRadius={16}
      >
        <div className={styles.content}>
          <div className={styles.iconContainer}>
            <MobileOutlined className={styles.mobileIcon} />
            <div className={styles.arrowIcon}>→</div>
            <DesktopOutlined className={styles.desktopIcon} />
          </div>
                    <p className={styles.description}>
            为了更好的体验，暂支持电脑端访问。
          </p>
          
          <h2 className={styles.title}>{
            showToast ? '已复制，去电脑端打开' : '请使用电脑访问'
          }</h2>    
          {/* 合并域名显示和复制按钮 */}
          <div 
            className={styles.domainContainer}
            onClick={handleCopyDomain}
          >
            <span className={styles.domainLabel}></span>
            <span className={styles.domainText}>
              www.{domain}
              <span className={styles.domainCopyIcon}>
                {copied ? <CheckOutlined /> : <CopyOutlined />}
              </span>
            </span>
          </div>
          
          <p className={styles.hint}>
            或：直接将此页面链接转发送到电脑微信打开
          </p>
        </div>
      </GlassPanel>
      {/* 添加底部备案信息 */}
      <div className={styles.footerInfo}>
        <p>© 2025 Banana AI. 释放你的创作潜能！</p>
      </div>
    </div>
  );
};

export default MobileWarning;
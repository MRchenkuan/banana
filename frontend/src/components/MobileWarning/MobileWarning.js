import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DesktopOutlined, MobileOutlined, CopyOutlined, CheckOutlined } from '@ant-design/icons';
import GlassPanel from '../GlassPanel';
import styles from './MobileWarning.module.css';

const MobileWarning = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      const currentUrl = window.location.href;
      
      if (navigator.clipboard && window.isSecureContext) {
        // 使用现代 Clipboard API
        await navigator.clipboard.writeText(currentUrl);
        message.success('链接已复制到剪贴板');
      } else {
        // 降级方案：使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          message.success('链接已复制到剪贴板');
        } catch (err) {
          console.error('复制失败:', err);
          message.error('复制失败，请手动复制链接');
        } finally {
          document.body.removeChild(textArea);
        }
      }
      
      // 显示复制成功状态
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (err) {
      console.error('复制链接失败:', err);
      message.error('复制失败，请手动复制链接');
    }
  };

  return (
    <div className={styles.mobileWarningOverlay}>
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
          
          <h2 className={styles.title}>请使用电脑访问</h2>
          
          <p className={styles.description}>
            为了更好的体验，暂不支持移动端。
          </p>
          
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>💃</span>
              <span>生成人物手办/一键换装</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🏠</span>
              <span>照片修复</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🚗</span>
              <span>制作职业照</span>
            </div>
          </div>
          
          <Button 
            type="primary" 
            size="large"
            className={`${styles.actionButton} ${copied ? styles.copied : ''}`}
            onClick={handleCopyLink}
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          >
            {copied ? '已复制链接' : '复制链接到电脑端打开'}
          </Button>
          
          <p className={styles.hint}>
            或者将此页面链接转发送到电脑端浏览器打开
          </p>
        </div>
      </GlassPanel>
    </div>
  );
};

export default MobileWarning;
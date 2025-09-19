import React from 'react';
import { Modal } from 'antd';
import GlassPanel from '../GlassPanel';
import QRCode from './qrcode.jpg';
import styles from './HelpPanel.module.css';

const HelpPanel = ({ visible, onClose }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={400}
      className='frame'
      centered
      styles={{
          content: { padding: 0,background: 'transparent', boxShadow: 'none' }
        }}
    >
      <GlassPanel
          shadow
          colored={true}
          gradientIntensity="high"
          style={{ width: '100%', padding: '24px' }}
          className={styles.modalContent}
        >
          <h2 className={styles.title}>联系我们</h2>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>客服邮箱</h3>
            <p>banana_ai@foxmail.com</p>
          </div>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>微信客服</h3>
            <div className={styles.qrcodeWrapper}>
              <div className={styles.qrcodeBox}>
                <img
                  src={QRCode}
                  alt="微信二维码"
                  className={styles.qrcodeImage}
                />
              </div>
              <p className={styles.qrcodeText}>扫码添加客服微信</p>
            </div>
          </div>
          
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>工作时间</h3>
            <p>周一至周五 9:00-18:00</p>
          </div>
      </GlassPanel>
    </Modal>
  );
};

export default HelpPanel;
import React from 'react';
import { Modal } from 'antd';
import GlassPanel from '../GlassPanel';
import QRCode from './qrcode.jpg';
import styles from './HelpPanel.module.css';
import { MailFilled, MailOutlined } from '@ant-design/icons';

const HelpPanel = ({ visible, onClose }) => {
  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={400}
      className='frame'
      centered
      styles={{
        content: { padding: 0, background: 'transparent', boxShadow: 'none' }
      }}
    >
      <GlassPanel
        shadow
        colored={true}
        gradientIntensity="high"
        style={{ width: '100%', padding: '24px' }}
        className={styles.modalContent}
      >
        <h2 className={styles.title}>帮助中心</h2>
        
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>常见问题</h3>
          <div className={styles.faqItem}>
            <h4 className={styles.faqQuestion}>为什么我充值了但是能量值没增加？</h4>
            <p className={styles.faqAnswer}>
              充值后如果能量值没有自动增加，请点击右上角的"刷新支付结果"按钮手动刷新充值记录。
              如果刷新后仍未增加，请联系客服处理。
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>联系方式</h3>
          <div className={styles.contactItem}>
            <h4>客服邮箱</h4>
            <p><MailOutlined /> banana_ai@foxmail.com</p>
          </div>
          
          <div className={styles.contactItem}>
            <h4>微信客服</h4>
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

          <div className={styles.contactItem}>
            <h4>工作时间</h4>
            <p>周一至周五 9:00-18:00</p>
          </div>
        </div>
      </GlassPanel>
    </Modal>
  );
};

export default HelpPanel;
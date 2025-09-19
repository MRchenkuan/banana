import React from 'react';
import { Typography } from 'antd';

const { Paragraph } = Typography;

const Footer = () => {
  const footerStyle = {
    padding: '40px 24px',
    textAlign: 'center',
    background: 'rgba(0, 0, 0, 0.1)',
    color: '#fff'
  };

  return (
    <div style={footerStyle}>
      <Paragraph style={{ color: '#fff', margin: '8px 0 0 0', fontSize: '12px' }}>
        © 2025 Banana AI. 超越你的创作。 <a 
          href="https://beian.miit.gov.cn/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#fff', textDecoration: 'none' }}
        >
          湘ICP备2024062407号-3
        </a>
      </Paragraph>
    </div>
  );
};

export default Footer;
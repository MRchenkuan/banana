import React from 'react';
import { Card, Row, Col, Typography, Radio } from 'antd';
import { CrownOutlined, RocketOutlined, StarOutlined, ThunderboltFilled, ThunderboltOutlined } from '@ant-design/icons';
import styles from './PackageCards.module.css';

const { Title } = Typography;

// 获取套餐图标的函数
const getIconForPackage = (packageId) => {
  const iconMap = {
    1: <ThunderboltOutlined style={{ fontSize: '24px', color: '#faad14' }} />,
    2: <ThunderboltOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
    3: <ThunderboltOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
    4: <ThunderboltOutlined style={{ fontSize: '24px', color: '#f5222d' }} />
  };
  return iconMap[packageId] || <ThunderboltFilled style={{ fontSize: '24px', color: '#faad14' }} />;
};

const PackageCards = ({ packages, selectedPackage, onPackageSelect }) => {
  return (
    <div>
      <Title level={4} style={{ marginBottom: '16px', color: '#ffffff' }}>
        选择充值套餐
      </Title>
      <Radio.Group
        value={selectedPackage}
        onChange={(e) => onPackageSelect(e.target.value)}
        style={{ width: '100%' }}
      >
        <Row gutter={[12, 12]} justify="center">
          {packages.map(pkg => {
            // 构建正确的className
            const cardClassName = selectedPackage === pkg.id 
              ? `${styles.packageCard} ${styles.selected}` 
              : styles.packageCard;
            
            return (
              <Col key={pkg.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  className={cardClassName}
                  onClick={() => onPackageSelect(pkg.id)}
                  // 使用 style 属性替代已弃用的 bordered 属性
                  style={{ border: 'none' }}
                >
                  <div className={styles.packageIcon}>{getIconForPackage(pkg.id)}</div>
                  <Title level={4} className={styles.packageTitle}>{pkg.name}</Title>
                  <div className={styles.packagePrice}>¥{pkg.amount}</div>
                  <div className={styles.packageTokens}>{pkg.tokens.toLocaleString()} 能量</div>
                  <div className={styles.packageDescription}>{pkg.description}</div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Radio.Group>
    </div>
  );
};

export default PackageCards;
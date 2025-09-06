import React from 'react';
import { Button, Typography } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TypewriterEffect from './TypewriterEffect';

const { Title } = Typography;

const HeroSection = ({ onLoginClick }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const heroStyle = {
    padding: '80px 204px',
    textAlign: 'left',
    position: 'relative',
    backgroundImage: `
      linear-gradient(80deg, rgba(102, 126, 234, 1) 45%, transparent 100%),
      url(https://pub-image-bed.cn-nb1.rains3.com/public/images/banner-hero.png?x-oss-process=image/resize,w_1200,h_600,m_fill/quality,q_80/format,webp)
    `,
    backgroundSize: 'contain',
    backgroundPosition: 'left center, right center',
    backgroundRepeat: 'no-repeat',
    minHeight: '600px'
  };

  const titleStyle = {
    color: '#fff',
    fontSize: '48px',
    marginBottom: '24px',
    position: 'relative',
    zIndex: 2
  };

  const actionButtonStyle = {
    height: '80px',
    fontSize: '24px',
    fontWeight: 'bold',
    padding: '0 60px',
    borderRadius: '40px',
    background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
    border: 'none',
    boxShadow: '0 8px 32px rgba(255, 107, 107, 0.4)',
    transition: 'all 0.3s ease',
    position: 'relative',
    zIndex: 2
  };

  const potentialAnswers = [
    `"水墨风格的沙漠，远处有海市蜃楼""`,
    `"背景太暗了，需要加一点亮度"`,
    `"人物表情再温柔点"`,
    `"加一点雾霾效果"`,
    `"70%莫奈+30%蒸汽朋克风格"`,
    `"画一只发光水母漂浮在珊瑚城堡旁，梦幻水彩风格，对话框里写'深海之歌'"`,
    `"将敦煌飞天壁画与机械齿轮结合，低饱和度哑光质感"`,
    `"生成科幻小说封面：宇航员在环形太空站逃跑，背后有异形生物逼近，高对比度配色"`,
  ];

  return (
    <div style={heroStyle}>
                    <TypewriterEffect texts={potentialAnswers} />
      <Title level={1} style={titleStyle}>
        释放你的创作潜能！
      </Title>

      <Button 
        type="primary"
        size="large"
        icon={<MessageOutlined />}
        onClick={() => isAuthenticated ? navigate('/chat') : onLoginClick()}
        style={actionButtonStyle}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 12px 40px rgba(255, 107, 107, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 8px 32px rgba(255, 107, 107, 0.4)';
        }}
      >
        🚀 开始创作
      </Button>

    </div>
  );
};

export default HeroSection;
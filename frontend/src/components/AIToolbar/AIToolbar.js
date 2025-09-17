import React, { useState } from 'react';
import {
  Button,
  Space,
  message
} from 'antd';
import {
  RobotOutlined,
  UserSwitchOutlined,
  SkinOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { compressImages } from '../../utils/imageCompression';
import GlassPanel from '../GlassPanel';
import styles from './AIToolbar.module.css';

const AIToolbar = ({ onToolClick, selectedImages = [], setInputValue, inputValue = '', onImageUpload }) => {
  const [hoveredTool, setHoveredTool] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [compressing, setCompressing] = useState(false);

  const tools = [
    {
      key: 'figurine',
      label: '生成手办',
      icon: <RobotOutlined />,
      previewImage: 'https://gemini-flash-image.cn-nb1.rains3.com/chat-images/2025/09/05/bff25509472155fa3454302e81983338',
      description: '将2D图片转换为3D手办模型',
      prompts: [
        '绘制图中角色的1/7比例的商业化手办，写实风格，真实环境，手办放在电脑桌上,电脑屏幕里的内容为该手办的C4D建模过程，电脑屏幕旁放着印有原画的BANDAI风格的塑料玩具包装盒，电脑桌上还有制作手办的工具'
      ] 
    },
    {
      key: 'faceSwap',
      label: '改变表情和姿势',
      icon: <UserSwitchOutlined />,
      previewImage: 'https://inews.gtimg.com/news_bt/O3u7K1vynMy4yWqY7fBvS-7TvKt-vmhVyvFoiYnZ4fXcAAA/641',
      description: '智能人脸替换技术',
      prompts: [
        '让图中人物笑起来，其他全部保持不变',
        '让图中人物显得很生气，其他全部保持不变',
        "让图中人物换个姿势，其他全部保持不变"
      ]
    },
    {
      key: 'clothingSwap',
      label: '一键换衣',
      icon: <SkinOutlined />,
      previewImage: 'https://inews.gtimg.com/news_bt/O3u7K1vynMy4yWqY7fBvS-7TvKt-vmhVyvFoiYnZ4fXcAAA/641',
      description: '虚拟试衣和服装替换',
      prompts: [
        '让图中人物换上夏天的衣服，其他全部保持不变',
        '把图中人物的衣服换成精致西服，其他全部保持不变',
      ]
    },
    {
      key: 'poseChange',
      label: '做成漫画',
      icon: <ThunderboltOutlined />,
      previewImage: 'https://inews.gtimg.com/news_bt/O3u7K1vynMy4yWqY7fBvS-7TvKt-vmhVyvFoiYnZ4fXcAAA/641',
      description: '智能姿态调整和重构',
      prompts: [
        '将图片做成漫画效果',
      ]
    },
  ];

  // 从tools中获取随机prompt的函数
  const getRandomPrompt = (toolKey) => {
    const selectedTool = tools.find(tool => tool.key === toolKey);
    if (selectedTool && selectedTool.prompts && selectedTool.prompts.length > 0) {
      const randomIndex = Math.floor(Math.random() * selectedTool.prompts.length);
      return selectedTool.prompts[randomIndex];
    }
    return null;
  };

  // 图片上传处理函数
  const handleImageUpload = async (toolKey) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
        // 检查是否需要压缩
        const needCompression = imageFiles.some(file => file.size > 500 * 1024);
        
        let finalFiles = imageFiles;
        
        if (needCompression) {
          setCompressing(true);
          
          try {
            message.loading('正在压缩图片...', 0);
            finalFiles = await compressImages(imageFiles, 500);
            message.destroy();
            message.success('图片压缩完成');
          } catch (error) {
            message.destroy();
            message.error(error.message || '图片压缩失败');
            setCompressing(false);
            return;
          } finally {
            setCompressing(false);
          }
        }
        
        // 通知父组件更新图片（清除旧图片）
        if (onImageUpload) {
          onImageUpload(finalFiles, true); // 第二个参数表示需要清除
        }
        
        // 图片上传完成后，延迟填入对应工具的随机prompt
        setTimeout(() => {
          const randomPrompt = getRandomPrompt(toolKey);
          if (randomPrompt && setInputValue) {
            setInputValue(randomPrompt);
          }
        }, 100);
        
        if (imageFiles.length > 4) {
          message.warning('最多只能上传4张图片');
        }
      }
    };
    input.click();
  };

  const handleToolClick = (toolKey) => {
    // 如果正在压缩，禁止操作
    if (compressing) {
      message.warning('图片正在压缩中，请稍候...');
      return;
    }
    
    // 每次点击工具都重新选择图片
    handleImageUpload(toolKey);
    
    // 调用父组件的处理函数
    if (onToolClick) {
      onToolClick(toolKey);
    }
  };

  const handleMouseEnter = (event, tool) => {
    const rect = event.target.getBoundingClientRect();
    const toolbarRect = event.target.closest('div').getBoundingClientRect();
    
    setHoverPosition({
      x: rect.left + rect.width / 2,
      y: toolbarRect.top // 使用 toolbar 的顶部位置
    });
    setHoveredTool(tool);
  };

  const handleMouseLeave = () => {
    setHoveredTool(null);
  };

  return (
    <>
      <GlassPanel 
        blur={15}
        opacity={0.08}
        gradientIntensity="high"
        borderRadius={8}
        className={styles.aiToolbar}
      >
        <Space size="small">
          {tools.map((tool) => (
            <Button
              key={tool.key}
              type="default"
              size="small"
              icon={React.cloneElement(tool.icon, { style: { color: '#ffffff' } })}
              className={styles.toolButton}
              onClick={() => handleToolClick(tool.key)}
              onMouseEnter={(e) => handleMouseEnter(e, tool)}
              onMouseLeave={handleMouseLeave}
            >
              {tool.label}
            </Button>
          ))}
        </Space>
      </GlassPanel>

      {/* 悬浮预览框 */}
      {hoveredTool && (
        <div
          className={styles.previewPanel}
          style={{
            left: hoverPosition.x - 110, // 预览框宽度的一半 (220/2 = 110)
            top: hoverPosition.y - 240, // 预览框高度 + 一些间距
          }}
        >
          <img
            src={hoveredTool.previewImage}
            alt={hoveredTool.label}
            className={styles.previewImage}
          />
          <div className={styles.previewTitle}>
            {hoveredTool.label}
          </div>
          <div className={styles.previewDescription}>
            {hoveredTool.description}
          </div>
        </div>
      )}
    </>
  );
};

export default AIToolbar;
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
      key: 'tool1',
      label: '生成手办',
      icon: <RobotOutlined />,
      previewImage: 'https://cn-nb1.rains3.com/pub-image-bed/public/images/tool-1.webp',
      description: '将2D图片转换为3D手办模型',
      prompts: [
        '绘制图中角色的1/7比例的商业化手办，写实风格，真实环境，手办放在电脑桌上,电脑屏幕里的内容为该手办的C4D建模过程，电脑屏幕旁放着印有原画的BANDAI风格的塑料玩具包装盒，电脑桌上还有制作手办的工具'
      ] 
    },
    {
      key: 'tool2',
      label: '证件照',
      icon: <RobotOutlined />,
      previewImage: 'https://pub-image-bed.cn-nb1.rains3.com/public/images/tools/7182ba6c07bc7ae368e6b3534f8e275f.png',
      description: '任意照片生成证件照',
      prompts: [
        '将图中人物照片生成蓝底证件照',
        '将图中人物照片生成白底证件照',
      ] 
    },
    {
      key: 'tool3',
      label: '改变表情',
      icon: <UserSwitchOutlined />,
      previewImage: 'https://pub-image-bed.cn-nb1.rains3.com/public/images/tools/349cf19eb277e53c9d2349576d543b82.png',
      description: '让闭眼照片睁开眼睛',
      prompts: [
        '让图中人物笑起来，其他全部保持不变',
        '让图中人物显得很生气，其他全部保持不变',
        "让图中人物换个姿势，其他全部保持不变"
      ]
    },
    {
      key: 'tool4',
      label: '一键换衣',
      icon: <SkinOutlined />,
      previewImage: 'https://pub-image-bed.cn-nb1.rains3.com/public/images/tools/41a8f9f294bc33e2c10424d069e1f10a.png',
      description: '虚拟试衣和服装替换',
      prompts: [
        '让图中人物换上夏天的衣服，其他全部保持不变',
        '把图中人物的衣服换成精致西服，其他全部保持不变',
      ]
    },
    {
      key: 'tool5',
      label: '做成漫画',
      icon: <ThunderboltOutlined />,
      previewImage: 'https://pub-image-bed.cn-nb1.rains3.com/public/images/tools/2d2a54dc428228282d58c01d3f156d45.png',
      description: '生成一幅四格漫画',
      prompts: [
        '为图中人物和场景生成一幅四格漫画',
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
          <div className={styles.previewDescription}>
            {hoveredTool.description}
          </div>
        </div>
      )}
    </>
  );
};

export default AIToolbar;
import React, { useState, useEffect } from 'react';
import { Alert, Button, Space, Typography, Spin } from 'antd';
import { CloseOutlined, BellOutlined } from '@ant-design/icons';
import GlassPanel from './GlassPanel/GlassPanel';
import styles from './AnnouncementHUD.module.css';
import { announcementService } from '../services/announcementService';

const { Text } = Typography;

const AnnouncementHUD = () => {
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [closedAnnouncements, setClosedAnnouncements] = useState(
    JSON.parse(localStorage.getItem('closedAnnouncements') || '[]')
  );

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await announcementService.getAnnouncements();
      if (response.success) {
        // 过滤掉已关闭的公告
        const activeAnnouncements = response.data.filter(
          announcement => !closedAnnouncements.includes(announcement.id)
        );
        setAllAnnouncements(activeAnnouncements);
      }
    } catch (error) {
      console.error('获取公告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAnnouncement = (announcementId) => {
    const newClosedAnnouncements = [...closedAnnouncements, announcementId];
    setClosedAnnouncements(newClosedAnnouncements);
    localStorage.setItem('closedAnnouncements', JSON.stringify(newClosedAnnouncements));
    
    // 移除当前公告，下一条会自动显示（因为我们总是显示索引0的公告）
    const newAnnouncements = allAnnouncements.filter(item => item.id !== announcementId);
    setAllAnnouncements(newAnnouncements);
  };

  const handleCloseAll = () => {
    const allIds = allAnnouncements.map(item => item.id);
    const newClosedAnnouncements = [...closedAnnouncements, ...allIds];
    setClosedAnnouncements(newClosedAnnouncements);
    localStorage.setItem('closedAnnouncements', JSON.stringify(newClosedAnnouncements));
    setAllAnnouncements([]);
  };

  const getAnnouncementType = (type) => {
    const typeMap = {
      'info': 'info',
      'warning': 'warning', 
      'error': 'error',
      'success': 'success'
    };
    return typeMap[type] || 'info';
  };

  // 总是显示第一条公告（索引0）
  const currentAnnouncement = allAnnouncements[0];

  if (loading) {
    return (
      <div className={styles.hudContainer}>
        <GlassPanel transparent={true} className={styles.loadingPanel}>
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spin size="small" />
            <Text style={{ marginLeft: '8px', color: '#ffffff' }}>加载公告中...</Text>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // 修复：当没有公告时直接返回null，不再依赖visible状态
  if (!currentAnnouncement) {
    return null;
  }

  return (
    <div className={styles.hudContainer}>
      {/* 显示当前公告和剩余数量 */}
      <div className={styles.announcementWrapper}>
        <GlassPanel 
          transparent={false} 
          colored={false}
          className={styles.announcementItem}
        >
          <div style={{ padding: '10px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '5px'
            }}>
              
              {1 && (<><Space>
                <BellOutlined style={{ color: '#ffffff' }} />
                <Text style={{ color: '#ffffff', fontSize: '12px' }}>
                  {allAnnouncements.length > 1 ? `还有 ${allAnnouncements.length - 1} 条公告` : '公告'}
                </Text>
              </Space>
                <Button
                  type="text"
                  size="small"
                  onClick={handleCloseAll}
                  style={{ color: '#ffffff', fontSize: '12px', padding: '0' }}
                >
                  全部关闭
                </Button></>
              )}
            </div>
            <Alert
              key={currentAnnouncement.id}
              message={currentAnnouncement.title}
              description={currentAnnouncement.content}
              type={getAnnouncementType(currentAnnouncement.type)}
              closable
              onClose={() => handleCloseAnnouncement(currentAnnouncement.id)}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#ffffff',
                textAlign: 'left',
                fontSize: '12px',
                padding: '0'
              }}
            />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default AnnouncementHUD;
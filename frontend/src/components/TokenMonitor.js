import React, { useState, useEffect } from 'react';
import { Card, Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, ExpandAltOutlined, CompressOutlined } from '@ant-design/icons';
import { tokenMonitorEvents } from '../utils/tokenMonitorEvents';
import { formatTokensToK, formatTokenDataToK } from '../utils/tokenFormatter';
import GlassPanel from './GlassPanel';

const TokenMonitor = ({ messages }) => {
  // 从localStorage读取初始状态，如果没有则默认为隐藏
  const [isVisible, setIsVisible] = useState(() => {
    const savedState = localStorage.getItem('tokenMonitorVisible');
    return savedState !== null ? JSON.parse(savedState) : false;
  });
  
  // 从localStorage读取展开状态，如果没有则默认为展开
  const [isExpanded, setIsExpanded] = useState(() => {
    const savedState = localStorage.getItem('tokenMonitorExpanded');
    return savedState !== null ? JSON.parse(savedState) : true;
  });
  
  const [latestTokenData, setLatestTokenData] = useState(null);
  
  // 监听token事件更新
  useEffect(() => {
    const unsubscribe = tokenMonitorEvents.subscribe((tokenData) => {
      setLatestTokenData(tokenData);
    });
    
    return unsubscribe;
  }, []);
  
  // 当显示状态变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('tokenMonitorVisible', JSON.stringify(isVisible));
  }, [isVisible]);
  
  // 当展开状态变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('tokenMonitorExpanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  // 格式化token数据显示
  const formatTokenData = (data) => {
    if (!data) return null;
    if (typeof data === 'object') {
      // 语义化处token数据
      if (data.input !== undefined && data.output !== undefined && data.total !== undefined) {
        return {
          formatted: true,
          prompt: data.input,
          completion: data.output,
          total: data.total
        };
      }
      return JSON.stringify(data, null, 2);
    }
    return data;
  };

  const tokenData = latestTokenData?.totalTokensUsed;
  const formattedData = formatTokenData(tokenData);
  
  if (!isVisible) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          zIndex: 1002  // 修改：从1000改为1002，确保高于HeaderBar的1001
        }}
      >
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => setIsVisible(true)}
          style={{
            backgroundColor: 'rgba(24, 144, 255, 0.8)',
            borderColor: 'rgba(24, 144, 255, 0.8)',
            backdropFilter: 'blur(4px)'
          }}
        />
      </div>
    );
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 1002,  // 修改：从1000改为1002，确保高于HeaderBar的1001
        width: isExpanded ? '320px' : '200px',
        transition: 'width 0.3s ease'
      }}
    >
      <GlassPanel
        colored={false}
      >
        {/* 标题栏 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            margin: '8px',
            fontSize: '12px',
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <span>Token 消耗监控</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 4px',
                height: '20px',
                width: '20px'
              }}
            />
            <Button
              type="text"
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setIsVisible(false)}
              style={{
                color: 'rgba(255, 255, 255, 0.6)',
                padding: '2px 4px',
                height: '20px',
                width: '20px'
              }}
            />
          </div>
        </div>
        
        {/* Token信息显示 */}
        {tokenData ? (
          <div>
            {!isExpanded ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(24, 144, 255, 0.1)',
                  border: '1px solid rgba(24, 144, 255, 0.3)',
                  transition: 'all 0.2s ease',
                  margin: '8px'
                }}
                onClick={() => setIsExpanded(true)}
              >
                <div style={{ color: '#1890ff', fontWeight: '500' }}>
                  {formattedData && formattedData.formatted 
                    ? formatTokensToK(formattedData.total)
                    : formatTokensToK(typeof tokenData === 'object' ? (tokenData.total || tokenData.totalTokens || 0) : tokenData)}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                  点击展开查看详情
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '8px', fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  最新Token消耗:
                </div>
                {formattedData && formattedData.formatted ? (
                  <div
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '12px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      lineHeight: '1.6',
                      color: '#fff',
                      margin:"0 12px"
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>输入消耗:</span>
                      <span style={{ color: '#52c41a' }}>{formatTokensToK(formattedData.prompt)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>输出消耗:</span>
                      <span style={{ color: '#1890ff' }}>{formatTokensToK(formattedData.completion)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 'bold' }}>总计消耗:</span>
                      <span style={{ fontWeight: 'bold', color: '#f5a623' }}>{formatTokensToK(formattedData.total)}</span>
                    </div>
                  </div>
                ) : (
                  <pre
                    style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      lineHeight: '1.4',
                      color: '#fff',
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '200px',
                      textAlign: 'left',
                      overflowY: 'auto'
                    }}
                  >
                    {formatTokenData(tokenData)}
                  </pre>
                )}
                {latestTokenData?.timestamp && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    textAlign: 'right',
                    margin: '6px 12px'
                  }}>
                    {latestTokenData.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              padding: '20px 0'
            }}
          >
            暂无Token消耗数据
            <br />
            开始对话后将显示Token信息
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default TokenMonitor;
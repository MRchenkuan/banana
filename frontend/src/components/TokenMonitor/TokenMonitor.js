import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, ExpandAltOutlined, CompressOutlined } from '@ant-design/icons';
import { tokenMonitorEvents } from '../../utils/tokenMonitorEvents';
import { formatTokensToK, formatTokenDataToK } from '../../utils/tokenFormatter';
import GlassPanel from '../GlassPanel';
import styles from './TokenMonitor.module.css';

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
      <div className={styles.tokenMonitor}>
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => setIsVisible(true)}
          className={styles.showButton}
        />
      </div>
    );
  }
  
  return (
    <div className={`${styles.tokenMonitor} ${isExpanded ? styles.tokenMonitorExpanded : styles.tokenMonitorCollapsed}`}>
      <GlassPanel colored={false}>
        {/* 标题栏 */}
        <div className={styles.titleBar}>
          <span>Token 消耗监控</span>
          <div className={styles.titleBarButtons}>
            <Button
              type="text"
              size="small"
              icon={isExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
              onClick={() => setIsExpanded(!isExpanded)}
              className={styles.titleBarButton}
            />
            <Button
              type="text"
              size="small"
              icon={<EyeInvisibleOutlined />}
              onClick={() => setIsVisible(false)}
              className={styles.titleBarButton}
            />
          </div>
        </div>
        
        {/* Token信息显示 */}
        {tokenData ? (
          <div>
            {!isExpanded ? (
              <div
                className={styles.collapsedTokenDisplay}
                onClick={() => setIsExpanded(true)}
              >
                <div className={styles.collapsedTokenValue}>
                  {formattedData && formattedData.formatted 
                    ? formatTokensToK(formattedData.total)
                    : formatTokensToK(typeof tokenData === 'object' ? (tokenData.total || tokenData.totalTokens || 0) : tokenData)}
                </div>
                <div className={styles.collapsedTokenHint}>
                  点击展开查看详情
                </div>
              </div>
            ) : (
              <div>
                <div className={styles.tokenInfo}>
                  最新Token消耗:
                </div>
                {formattedData && formattedData.formatted ? (
                  <div className={styles.tokenDetails}>
                    <div className={styles.tokenRow}>
                      <span>输入消耗:</span>
                      <span className={styles.inputTokens}>{formatTokensToK(formattedData.prompt)}</span>
                    </div>
                    <div className={styles.tokenRow}>
                      <span>输出消耗:</span>
                      <span className={styles.outputTokens}>{formatTokensToK(formattedData.completion)}</span>
                    </div>
                    <div className={styles.tokenRowTotal}>
                      <span>总计消耗:</span>
                      <span className={styles.totalTokens}>{formatTokensToK(formattedData.total)}</span>
                    </div>
                  </div>
                ) : (
                  <pre className={styles.rawTokenData}>
                    {formatTokenData(tokenData)}
                  </pre>
                )}
                {latestTokenData?.timestamp && (
                  <div className={styles.timestamp}>
                    {latestTokenData.timestamp.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
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
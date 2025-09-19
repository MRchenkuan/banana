import React, { useState, useEffect } from 'react';
import { Layout as AntLayout, Avatar, Dropdown, Space, Typography, Button, Spin } from 'antd';
import { 
  UserOutlined, 
  LogoutOutlined,
  DollarCircleFilled,
  ThunderboltFilled,
  QuestionCircleFilled
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToken } from '../../contexts/TokenContext';
import SessionSidebar from '../SessionSidebar/SessionSidebar';
import PaymentModal from '../PaymentModal/PaymentModal';
import PaymentHistory from '../PaymentModal/PaymentHistory';
import HelpPanel from '../HelpPanel/HelpPanel';
import { useChatContext } from '../../contexts/ChatContext';
import useSessionsStore from '../../hooks/useSessionsStore';
import useSessionManager from '../../hooks/useSessionManager';
import { EventBus } from '../../services/core/HttpClient';
import { usePayment } from '../../hooks/usePayment';
import styles from './Layout.module.css';

const { Header, Content } = AntLayout;
const { Text } = Typography;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { balance } = useToken();
  const { currentSessionId, setCurrentSessionId } = useChatContext();
  const { sessions, sessionsLoading } = useSessionsStore();
  const { throttledRefreshOrderStatus } = usePayment();

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');
  const [refreshing, setRefreshing] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  const { createNewSession, deleteSession, isCreatingSession } = useSessionManager(
    setCurrentSessionId,
    navigate,
    currentSessionId
  );

  const handleSessionSwitch = (sessionId) => {
    setCurrentSessionId(sessionId);
    navigate('/app/chat');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: logout
    }
  ];

  useEffect(() => {
    const unsubscribe = EventBus.subscribe('INSUFFICIENT_BALANCE', () => {
      setPaymentModalVisible(true);
      setDefaultPackage('standard');
    });
    return () => unsubscribe();
  }, []);

  return (
    <AntLayout className={styles.layout}>
      {isCreatingSession && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingContent}>
            <Spin size="large" />
            <div className={styles.loadingText}>创建会话中...</div>
          </div>
        </div>
      )}

      <Header className={styles.header}>
        <div 
          className={styles.logo}
          onClick={() => navigate('/')}
        >
          🍌 Banana
        </div>

        <Space size="large">
          <Button
            type="text"
            size="small"
            icon={<QuestionCircleFilled className={styles.helpButtonIcon} />}
            onClick={() => setHelpVisible(true)}
            className={styles.helpButton}
          >
            帮助
          </Button>

          <div className={styles.tokenGroup}>
            <div 
              onClick={() => {
                setPaymentModalVisible(true);
                setDefaultPackage('standard');
              }}
              className={styles.tokenValue}
            >
              <ThunderboltFilled className={styles.tokenIcon} />
              <Text className={styles.tokenText}>
                {typeof balance === 'number' ? balance.toLocaleString() : '0'} 能量值
              </Text>
            </div>

            <div
              onClick={() => setHistoryVisible(true)}
              className={styles.refreshButton}
            >
              <DollarCircleFilled spin={refreshing} className={styles.refreshIcon} />
              <span style={{lineHeight:1, fontSize:'12px',marginLeft:'4px'}}>刷新支付结果</span>
            </div>
          </div>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
            <Space className={styles.userDropdown}>
              <Avatar 
                icon={<UserOutlined />} 
                src={user?.wechatAvatar} 
                className={styles.avatar}
              />
              <div>
                <Text className={styles.username}>{user?.username}</Text>
                <Text className={styles.userId}>用户ID: {user?.id}</Text>
              </div>
            </Space>
          </Dropdown>
        </Space>
      </Header>

      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        sessionsLoading={sessionsLoading}
        onSessionSwitch={handleSessionSwitch}
        createNewSession={createNewSession}
        deleteSession={deleteSession}
        isCreatingSession={isCreatingSession}
      />

      <Content className={styles.content}>
        <div className={styles.contentInner}>
          {children}
        </div>
      </Content>

      <HelpPanel 
        visible={helpVisible}
        onClose={() => setHelpVisible(false)}
      />

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        defaultPackage={defaultPackage}
      />

      <PaymentHistory
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onRefreshOrderStatus={throttledRefreshOrderStatus}
      />
    </AntLayout>
  );
};

export default Layout;
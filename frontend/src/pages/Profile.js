import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Space,
  Button,
  message,
  Spin
} from 'antd';
import {
  UserOutlined,
  WalletOutlined,
  MessageOutlined,
  CalendarOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useToken } from '../contexts/TokenContext';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const Profile = () => {
  const [loading, setLoading] = useState(false);
  const [usageStats, setUsageStats] = useState({
    dailyUsage: 0,
    monthlyUsage: 0,
    totalUsage: 0,
    chatCount: 0
  });
  const [usageHistory, setUsageHistory] = useState([]);
  const [dateRange, setDateRange] = useState([
    dayjs().subtract(7, 'day'),
    dayjs()
  ]);
  
  const { user } = useAuth();
  const { balance } = useToken();

  useEffect(() => {
    loadUserStats();
    loadUsageHistory();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await api.user.getUserStats();
      setUsageStats(response.data);
    } catch (error) {
      console.error('加载用户统计失败:', error);
      message.error('加载统计数据失败');
    }
  };

  const loadUsageHistory = async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;

      const response = await api.user.getTokenUsageHistory(
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      setUsageHistory(response.data.usage);
    } catch (error) {
      console.error('加载使用历史失败:', error);
      message.error('加载使用历史失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  const handleRefresh = () => {
    loadUserStats();
    loadUsageHistory();
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
      width: 180
    },
    {
      title: '对话类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <span>
          {type === 'text' ? '📝 文本' : '🖼️ 图片'}
        </span>
      ),
      width: 100
    },
    {
      title: '消耗 Tokens',
      dataIndex: 'tokensUsed',
      key: 'tokensUsed',
      render: (tokens) => (
        <Text strong style={{ color: '#f5222d' }}>
          -{tokens.toLocaleString()}
        </Text>
      ),
      width: 120
    },
    {
      title: '对话内容',
      dataIndex: 'userMessage',
      key: 'userMessage',
      ellipsis: true,
      render: (text) => (
        <Text style={{ maxWidth: '300px' }}>
          {text || '图片对话'}
        </Text>
      )
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={3} style={{ margin: 0 }}>
          👤 个人中心
        </Title>
        <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
          刷新数据
        </Button>
      </div>
      
      {/* 用户信息卡片 */}
      <Card title="基本信息" style={{ marginBottom: '24px' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '8px' }} />
              <div>
                <Text strong style={{ fontSize: '16px' }}>{user?.username}</Text>
                <br />
                <Text type="secondary">{user?.email}</Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="当前余额"
              value={balance}
              precision={0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<WalletOutlined />}
              suffix="tokens"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="总对话次数"
              value={usageStats.chatCount}
              precision={0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<MessageOutlined />}
              suffix="次"
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="累计消耗"
              value={usageStats.totalUsage}
              precision={0}
              valueStyle={{ color: '#f5222d' }}
              suffix="tokens"
            />
          </Col>
        </Row>
      </Card>
      
      {/* 使用统计 */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="今日消耗"
              value={usageStats.dailyUsage}
              precision={0}
              valueStyle={{ color: '#722ed1' }}
              suffix="tokens"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="本月消耗"
              value={usageStats.monthlyUsage}
              precision={0}
              valueStyle={{ color: '#eb2f96' }}
              suffix="tokens"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="平均每次消耗"
              value={usageStats.chatCount > 0 ? Math.round(usageStats.totalUsage / usageStats.chatCount) : 0}
              precision={0}
              valueStyle={{ color: '#fa8c16' }}
              suffix="tokens"
            />
          </Card>
        </Col>
      </Row>
      
      {/* 使用历史 */}
      <Card
        title="使用历史"
        extra={
          <Space>
            <CalendarOutlined />
            <RangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              onOk={loadUsageHistory}
              format="YYYY-MM-DD"
            />
          </Space>
        }
      >
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={usageHistory}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            scroll={{ x: 800 }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default Profile;
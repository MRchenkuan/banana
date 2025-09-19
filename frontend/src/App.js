import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider } from './contexts/AuthContext';
import { TokenProvider } from './contexts/TokenContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import WechatCallback from './pages/WechatCallback';
import MobileWarning from './components/MobileWarning';
import UrlConfig from './utils/urlConfig';
import styles from './styles/pages/App.module.css';
import './App.css'; // 如果还有其他全局样式

// 导入主题配置
import { switchTheme, theme as customTheme } from './constants/theme';
import { ChatProvider } from './contexts/ChatContext';

// 暴露全局函数
window.switchTheme = switchTheme;
window.customTheme = customTheme;

function App() {
  // 检测是否为移动设备
  const isMobile = UrlConfig.isAccessFromMobileDevice();

  useEffect(() => {
    // 重写localStorage方法以添加日志
    const originalSetItem = localStorage.setItem;
    const originalGetItem = localStorage.getItem;
    const originalRemoveItem = localStorage.removeItem;

    localStorage.setItem = function(key, value) {
      return originalSetItem.apply(this, arguments);
    };

    localStorage.getItem = function(key) {
      const value = originalGetItem.apply(this, arguments);
      return value;
    };

    localStorage.removeItem = function(key) {
      return originalRemoveItem.apply(this, arguments);
    };
  }, []);

  // 如果是移动设备，显示提示页面
  if (isMobile) {
    return <MobileWarning />;
  }
  
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: customTheme.primary,
          colorBgContainer: '#1f1f1f',
          colorBgElevated: '#262626',
          colorBgLayout: '#141414',
          colorText: '#ffffff',
          colorTextSecondary: '#a6a6a6',
          colorBorder: '#434343',
        },
      }}
    >
      <AuthProvider>
        <TokenProvider>
          <ChatProvider> {/* 确保 ChatProvider 包裹了整个应用 */}
            <Router future={{ v7_startTransition: true }}>
              <div className='App'>
              {isMobile ? (
                <MobileWarning />
              ) : (
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/wechat-login-callback" element={<WechatCallback />} />
                  <Route path="/app/*" element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route index element={<Navigate to="/app/chat" replace />} />
                          <Route path="chat" element={<Chat />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/chat" element={<Navigate to="/app/chat" replace />} />
                </Routes>
              )}
              </div>
            </Router>
          </ChatProvider>
        </TokenProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;

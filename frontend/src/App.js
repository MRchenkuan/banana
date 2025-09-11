import React from 'react';
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
import Profile from './pages/Profile';
import WechatQRScan from './pages/WechatQRScan';
import WechatCallback from './pages/WechatCallback';
import './App.css';

import { switchTheme, theme as customTheme } from './constants/theme';

// 将 switchTheme 函数暴露到全局，方便在控制台调用
window.switchTheme = switchTheme;
window.customTheme = customTheme;

// 在App组件的开头添加
function App() {
  // 监听localStorage变化
  React.useEffect(() => {
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalClear = localStorage.clear;
    
    localStorage.setItem = function(key, value) {
      console.log('📝 localStorage.setItem:', key, value);
      return originalSetItem.apply(this, arguments);
    };
    
    localStorage.removeItem = function(key) {
      console.log('🗑️ localStorage.removeItem:', key);
      return originalRemoveItem.apply(this, arguments);
    };
    
    localStorage.clear = function() {
      console.log('🧹 localStorage.clear called');
      return originalClear.apply(this, arguments);
    };
    
    return () => {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      localStorage.clear = originalClear;
    };
  }, []);
  
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
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/wechat-callback" element={<WechatCallback />} />
                <Route path="/wechat/qr-scan" element={<WechatQRScan />} />

                <Route path="/app/*" element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route index element={<Navigate to="/app/chat" replace />} />
                        <Route path="chat" element={<Chat />} />
                        <Route path="profile" element={<Profile />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/chat" element={<Navigate to="/app/chat" replace />} />
                <Route path="/profile" element={<Navigate to="/app/profile" replace />} />
              </Routes>
            </div>
          </Router>
        </TokenProvider>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;

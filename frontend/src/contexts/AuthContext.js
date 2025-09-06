import React, { createContext, useContext, useState, useEffect } from 'react';
import { message } from 'antd';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/auth/profile');
      setUser(response.data.user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      api.setAuthToken(newToken);
      
      message.success('登录成功！');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '登录失败';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);
      api.setAuthToken(newToken);
      
      message.success('注册成功！');
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || '注册失败';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    api.setAuthToken(null);
    message.info('已退出登录');
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  // 在 AuthProvider 组件中添加
  const wechatLogin = async (token, userData) => {
    try {
      // 先设置localStorage
      localStorage.setItem('token', token);
      
      // 立即更新状态
      setToken(token);
      setUser(userData);
      api.setAuthToken(token);
      
      // 确保状态同步完成
      setLoading(false);
      
      message.success('微信登录成功！');
      return { success: true };
    } catch (error) {
      const errorMessage = '微信登录失败';
      message.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };
  
  // 优化useEffect，监听localStorage变化
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem('token');
      if (newToken !== token) {
        setToken(newToken);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token]);
  
  // 在 value 对象中添加
  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    wechatLogin, // 添加这行
    isAuthenticated: !!token && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
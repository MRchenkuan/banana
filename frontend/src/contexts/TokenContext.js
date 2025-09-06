import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const TokenContext = createContext();

export const useToken = () => {
  const context = useContext(TokenContext);
  if (!context) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
};

export const TokenProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0);
  const [usageStats, setUsageStats] = useState({
    todayUsage: 0,
    monthUsage: 0,
    totalUsage: 0,
    chatCount: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      setBalance(user.tokenBalance || 0);
      fetchUsageStats();
    }
  }, [isAuthenticated, user]);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user/balance');
      setBalance(response.data.balance);
      return response.data.balance;
    } catch (error) {
      console.error('获取余额失败:', error);
      return balance;
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await api.get('/user/usage-stats');
      setUsageStats(response.data);
    } catch (error) {
      console.error('获取使用统计失败:', error);
    }
  };

  const updateBalance = (newBalance) => {
    setBalance(newBalance);
  };

  const deductTokens = (amount) => {
    setBalance(prev => Math.max(0, prev - amount));
  };

  const addTokens = (amount) => {
    setBalance(prev => prev + amount);
  };

  const value = {
    balance,
    usageStats,
    loading,
    fetchBalance,
    fetchUsageStats,
    updateBalance,
    deductTokens,
    addTokens
  };

  return (
    <TokenContext.Provider value={value}>
      {children}
    </TokenContext.Provider>
  );
};
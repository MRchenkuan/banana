import React, { createContext, useContext, useState } from 'react';

const PaymentModalContext = createContext();

export const usePaymentModal = () => {
  const context = useContext(PaymentModalContext);
  if (!context) {
    throw new Error('usePaymentModal must be used within a PaymentModalProvider');
  }
  return context;
};

export const PaymentModalProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [defaultPackage, setDefaultPackage] = useState('standard');

  const openPaymentModal = (packageId = 'standard') => {
    setDefaultPackage(packageId);
    setIsVisible(true);
  };

  const closePaymentModal = () => {
    setIsVisible(false);
  };

  const value = {
    isVisible,
    defaultPackage,
    openPaymentModal,
    closePaymentModal
  };

  return (
    <PaymentModalContext.Provider value={value}>
      {children}
    </PaymentModalContext.Provider>
  );
};
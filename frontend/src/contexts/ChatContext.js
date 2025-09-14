import React, { createContext, useContext, useState } from 'react';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children, value }) => {
  // 如果外部没有提供value，则在内部创建状态
  const [selectedImages, setSelectedImagesState] = useState([]);
  
  // 使用外部提供的value或内部状态
  const contextValue = value || {
    setSelectedImages: setSelectedImagesState,
    setInputValue: () => {}, // 添加默认的空函数
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};
export { ChatContext };

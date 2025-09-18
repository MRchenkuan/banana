import React, { createContext, useContext } from 'react';
import useChat from '../hooks/useChat';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const chatState = useChat();
  
  return (
    <ChatContext.Provider value={chatState}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};
export { ChatContext };

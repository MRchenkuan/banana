import { useState, useEffect } from 'react';
import useTypewriter from './useTypewriter';

export const useTypewriterEffect = (message, messageState) => {
  const [typewriterCompleted, setTypewriterCompleted] = useState(false);
  
  // 判断当前是否应该使用打字机效果（考虑完成状态）
  const shouldUseTypewriter = messageState.shouldStartTypewriter && !typewriterCompleted;
  
  // 为 AI 消息使用打字机效果
  const { displayedText, isTyping } = useTypewriter(
    message.content || '',
    10, // 调整速度
    messageState.isStreaming,
    shouldUseTypewriter
  );
  
  // 监听打字机完成状态
  useEffect(() => {
    if (messageState.shouldStartTypewriter && 
        !isTyping && 
        displayedText === message.content && 
        !messageState.isStreaming) {
      setTypewriterCompleted(true);
    }
  }, [isTyping, displayedText, message.content, messageState.isStreaming, messageState.shouldStartTypewriter]);
  
  // 重置打字机状态（当消息内容变化时）
  useEffect(() => {
    if (messageState.shouldStartTypewriter) {
      setTypewriterCompleted(false);
    }
  }, [message.content, messageState.shouldStartTypewriter]);
  
  // 决定显示的内容
  const contentToShow = shouldUseTypewriter ? displayedText : message.content;
  
  return {
    displayedText,
    isTyping,
    contentToShow,
    shouldUseTypewriter,
    typewriterCompleted
  };
};
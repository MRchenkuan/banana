import { useState, useEffect, useRef } from 'react';

export const useMessageTimer = (isThinking, isError, isStreaming, role) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const finalTimeRef = useRef(0);
  const startTimeRef = useRef(null);
  const isAssistant = role === 'assistant';
  
  // 计时器效果 - 确保计时器永远显示
  useEffect(() => {
    let interval;
    
    if (isAssistant && !isError) {
      if ((isThinking || isStreaming)) {
        // 如果还没有开始计时，记录开始时间
        if (!startTimeRef.current) {
          startTimeRef.current = Date.now();
        }
        
        interval = setInterval(() => {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          const formattedTime = elapsed.toFixed(1);
          setElapsedTime(formattedTime);
          finalTimeRef.current = formattedTime; // 持续保存最终时间
        }, 100); // 100毫秒间隔，精确到0.1秒
      } else if (finalTimeRef.current > 0) {
        // AI消息完成后，永远保持显示最终时间
        setElapsedTime(finalTimeRef.current);
      }
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isThinking, isError, isStreaming, isAssistant]);
  
  // 确保即使在组件重新渲染时也能保持计时器显示
  useEffect(() => {
    if (isAssistant && !isError && finalTimeRef.current > 0 && !isThinking && !isStreaming) {
      setElapsedTime(finalTimeRef.current);
    }
  }, [isAssistant, isError, isThinking, isStreaming]);
  
  return elapsedTime;
};
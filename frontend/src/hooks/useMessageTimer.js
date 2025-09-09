import { useState, useEffect, useRef } from 'react';

export const useMessageTimer = (isThinking, isError, isStreaming, role) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const finalTimeRef = useRef(0);
  const isAssistant = role === 'assistant';
  
  // 计时器效果 - 当消息处于思考或流式输出状态时启动
  useEffect(() => {
    let interval;
    if ((isThinking || isStreaming) && !isError && isAssistant) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const formattedTime = elapsed.toFixed(1);
        setElapsedTime(formattedTime);
        finalTimeRef.current = formattedTime; // 保存最终时间
      }, 100); // 100毫秒间隔，精确到0.1秒
    } else if (!isThinking && !isStreaming && isAssistant && finalTimeRef.current > 0) {
      // AI消息完成后，保持显示最终时间
      setElapsedTime(finalTimeRef.current);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isThinking, isError, isStreaming, isAssistant]);
  
  return elapsedTime;
};
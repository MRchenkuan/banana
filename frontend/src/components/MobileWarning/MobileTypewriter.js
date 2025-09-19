import React, { useState, useEffect } from 'react';

const MobileTypewriter = ({ text, speed = 80, onComplete }) => {
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!text) return;

    const timeout = setTimeout(() => {
      if (isPaused) {
        setIsPaused(false);
        setIsDeleting(true);
        setIsTyping(true);
        return;
      }

      if (isDeleting) {
        setIsTyping(true);
        setCurrentText(text.substring(0, currentText.length - 1));
      } else {
        setIsTyping(true);
        setCurrentText(text.substring(0, currentText.length + 1));
      }

      if (!isDeleting && currentText === text) {
        setIsTyping(false);
        setIsPaused(true);
        
        // 文字完成打印，并暂停2秒后，触发完成回调
        if (!isCompleted) {
          setIsCompleted(true);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 2000);
        }
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setIsTyping(false);
      }
    }, isPaused ? 2000 : isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, text, speed, isCompleted, onComplete]);

  // 当文本变化时重置状态
  useEffect(() => {
    setCurrentText('');
    setIsDeleting(false);
    setIsPaused(false);
    setIsTyping(true);
    setIsCompleted(false);
  }, [text]);

  return (
    <div style={{
      minHeight: '60px',
      fontSize: '16px',
      lineHeight: '1.5',
      color: '#fff',
      opacity: 0.9,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start', // 改为左对齐
      textAlign: 'left', // 改为左对齐
      padding: '0 15px', // 增加左侧内边距
      width: '100%' // 确保宽度占满
    }}>
      {currentText}
      <span style={{
        animation: isTyping ? 'none' : 'blink 1s infinite',
        fontSize: '16px',
        color: '#4ecdc4',
        marginLeft: '2px'
      }}>|</span>
    </div>
  );
};

export default MobileTypewriter;
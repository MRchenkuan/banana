import React, { useState, useEffect } from 'react';

const TypewriterEffect = ({ texts = [], speed = 80 }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (texts.length === 0) return;

    const timeout = setTimeout(() => {
      const fullText = texts[currentTextIndex];
      
      if (isPaused) {
        setIsPaused(false);
        setIsDeleting(true);
        setIsTyping(true);
        return;
      }

      if (isDeleting) {
        setIsTyping(true);
        setCurrentText(fullText.substring(0, currentText.length - 1));
      } else {
        setIsTyping(true);
        setCurrentText(fullText.substring(0, currentText.length + 1));
      }

      if (!isDeleting && currentText === fullText) {
        setIsTyping(false); // 停止打字，光标可以闪烁
        setIsPaused(true);
      } else if (isDeleting && currentText === '') {
        setIsDeleting(false);
        setIsTyping(false); // 准备开始新文字
        setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
      }
    }, isPaused ? 2000 : isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, isPaused, currentTextIndex, texts, speed]);

  return (
    <div style={{
      minHeight: '120px',
      fontSize: '24px',
      lineHeight: '2',
      color: '#fff',
      opacity: 0.9,
      display: 'flex',
      alignItems: 'center',
    }}>
      {currentText}
      <span style={{
        animation: isTyping ? 'none' : 'blink 1s infinite',
        fontSize: '24px',
        color: '#4ecdc4',
        marginLeft: '2px'
      }}>|</span>
    </div>
  );
};

export default TypewriterEffect;
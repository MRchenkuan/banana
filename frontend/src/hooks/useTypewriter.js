import { useState, useEffect, useRef } from 'react';

const useTypewriter = (text, speed = 50, isStreaming = false, shouldAnimate = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const chunkCacheRef = useRef(''); // 缓存完整的文本内容
    const cursorRef = useRef(0); // 记录当前打字位置
    const animationFrameId = useRef(null);
    const lastUpdateTimeRef = useRef(0);
    const initialTextRef = useRef('');

    useEffect(() => {
        // 当text变化时，更新缓存
        if (text !== initialTextRef.current) {
            chunkCacheRef.current = text;
            initialTextRef.current = text;
        }
    }, [text]);

    useEffect(() => {
        if (!shouldAnimate) {
            setDisplayedText(chunkCacheRef.current);
            cursorRef.current = chunkCacheRef.current.length;
            return;
        }

        const animate = (currentTime) => {
            if (!lastUpdateTimeRef.current) {
                lastUpdateTimeRef.current = currentTime;
            }

            const deltaTime = currentTime - lastUpdateTimeRef.current;

            if (deltaTime > speed) {
                if (cursorRef.current < chunkCacheRef.current.length) {
                    // 还有内容需要显示，继续打字
                    cursorRef.current += 1;
                    setDisplayedText(chunkCacheRef.current.substring(0, cursorRef.current));
                    lastUpdateTimeRef.current = currentTime;
                } else {
                    // 所有内容都已显示完毕，停止动画
                    cancelAnimationFrame(animationFrameId.current);
                    animationFrameId.current = null;
                    return;
                }
            }
            animationFrameId.current = requestAnimationFrame(animate);
        };

        // 只要还有内容需要显示，就继续动画
        if (cursorRef.current < chunkCacheRef.current.length) {
            animationFrameId.current = requestAnimationFrame(animate);
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [speed, shouldAnimate, text]); // 移除 isStreaming 依赖

    // 当流式结束时，确保显示所有内容（但不强制停止动画）
    useEffect(() => {
        if (!isStreaming && shouldAnimate) {
            // 更新缓存，让动画自然完成
            chunkCacheRef.current = text;
        }
    }, [isStreaming, shouldAnimate, text]);

    return { 
        displayedText, 
        isTyping: animationFrameId.current !== null && cursorRef.current < chunkCacheRef.current.length 
    };
};

export default useTypewriter;
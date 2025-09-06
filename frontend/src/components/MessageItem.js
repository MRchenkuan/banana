import React, { useState, useEffect } from 'react';
import {
  Avatar,
  Typography,
  Image
} from 'antd';
import {
  UserOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import useTypewriter from '../hooks/useTypewriter';
import 'highlight.js/styles/github.css';
import { optimizeImage } from '../utils/imageOptimizer';

const { Paragraph } = Typography;

const MessageItem = ({ message, index }) => {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isThinking = message.isThinking;
  const isError = message.isError;
  
  // 添加新的状态判断
  const isInterrupted = message.isInterrupted || message.streamStatus === 'interrupted';
  const isPending = message.isPending || message.streamStatus === 'pending';
  const isStreaming = message.isStreaming || message.streamStatus === 'streaming';
  
  // 计时器状态
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // 判断是否为历史消息：如果消息有完整的tokensUsed且不在流式状态，且没有isNewMessage标识，则认为是历史消息
  const isHistoryMessage = message.tokensUsed !== undefined && !isStreaming && !message.isNewMessage;
  
  // 使用独立的状态来控制打字机效果
  const [typewriterCompleted, setTypewriterCompleted] = useState(false);
  
  // 历史消息不启动打字机效果
  const shouldStartTypewriter = isAssistant && !isThinking && !isError && !isInterrupted && !isPending && !isHistoryMessage;
  
  // 判断当前是否应该使用打字机效果（考虑完成状态）
  const shouldUseTypewriter = shouldStartTypewriter && !typewriterCompleted;
  
  // 计时器效果 - 当消息处于思考状态时启动，报错时停止但保留时间
  useEffect(() => {
    let interval;
    if (isThinking && !isError) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setElapsedTime(elapsed.toFixed(1));
      }, 100); // 100毫秒间隔，精确到0.1秒
    }
    // 注意：当isError为true时，不重置elapsedTime，保持报错时刻的时间
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isThinking, isError]);
  
  // 为 AI 消息使用打字机效果
  const { displayedText, isTyping } = useTypewriter(
    message.content || '',
    10, // 调整速度
    isStreaming,
    shouldUseTypewriter
  );
  
  // 监听打字机完成状态
  useEffect(() => {
    if (shouldStartTypewriter && !isTyping && displayedText === message.content && !isStreaming) {
      setTypewriterCompleted(true);
    }
  }, [isTyping, displayedText, message.content, isStreaming, shouldStartTypewriter]);
  
  // 重置打字机状态（当消息内容变化时）
  useEffect(() => {
    if (shouldStartTypewriter) {
      setTypewriterCompleted(false);
    }
  }, [message.content, shouldStartTypewriter]);
  
  // 决定显示的内容
  const contentToShow = shouldUseTypewriter ? displayedText : message.content;
  
  // 获取消息样式
  const getMessageStyle = () => {
    return {};
  };
  
  // 获取状态图标
  const getStatusIcon = () => {
    if (isThinking) return '💭';
    return '🍌';
  };
  
  // 获取状态文本
  const getStatusText = () => {
    if (isError) return '错误';
    if (isInterrupted) return '中断';
    if (isPending) return '等待中';
    if (isStreaming) return '输入中';
    return '';
  };
  
  // 获取消息容器样式
  const messageContainerStyle = {
    position: 'relative',
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: isUser ? '#1890ff' : (isThinking ? '#1e3a5f' : '#262626'),
    color: isUser ? '#fff' : (isThinking ? '#1890ff' : '#ffffff'),
    border: isThinking ? '2px dashed #1890ff' : '1px solid #434343',
    animation: isThinking ? 'pulse 1.5s infinite' : 'none',
    wordBreak: 'break-word',
    lineHeight: '1.6',
    ...getMessageStyle()
  };
  
  return (
    <div
      style={{
        display: 'flex',
        marginBottom: '24px',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        position: 'relative' // 添加相对定位
      }}
    >
      {/* AI头像 - 只在左侧显示 */}
      {isAssistant && (
        <Avatar
          style={{
            backgroundColor: isError ? '#d9d9d9' : isInterrupted ? '#f59e0b' : isPending ? '#0284c7' : '#eee',
            marginRight: '12px',
            flexShrink: 0,
            fontSize: '18px'
          }}
        >
          {getStatusIcon()}
        </Avatar>
      )}
      
      {/* 消息内容容器 */}
      <div style={messageContainerStyle}>
        {/* 消息内容 */}
        <div
          style={{
            margin: 0,
            color: isUser ? '#fff' : (isThinking ? '#1890ff' : '#ffffff'),
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isThinking ? (
            // 思考消息的特殊显示
            <>
              <span>{contentToShow}</span>
              <span 
                style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '4px',
                  backgroundColor: '#1890ff',
                  borderRadius: '50%',
                  marginLeft: '8px',
                  animation: 'pulse 1.5s infinite'
                }}
              />
            </>
          ) : message.type === 'image' && message.imageUrl ? (
            // 图片消息显示
            <div style={{ width: '100%' }}>
              <Image
                src={optimizeImage(message.imageUrl, 'chat')} // 使用图片优化
                alt="用户上传的图片"
                style={{
                  maxWidth: '300px',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  marginBottom: message.content ? '8px' : '0'
                }}
                preview={{
                  mask: '预览图片',
                  src: message.imageUrl // 预览时使用原图
                }}
              />
              {message.content && (
                <div style={{ marginTop: '8px' }}>
                  {message.content}
                </div>
              )}
            </div>
          ) : isAssistant ? (
            // AI消息使用markdown渲染
            <div style={{ position: 'relative', width: '100%' }}>
              <ReactMarkdown
                components={{
                  // 使用 div 替代 p 作为根容器，避免嵌套问题
                  p: ({ children }) => {
                    // 始终使用div来避免嵌套问题
                    return (
                      <div style={{ margin: '0 0 8px 0', lineHeight: '1.6' }}>
                        {children}
                      </div>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 style={{ margin: '16px 0 8px 0', fontSize: '1.5em', fontWeight: 'bold' }}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ margin: '14px 0 6px 0', fontSize: '1.3em', fontWeight: 'bold' }}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ margin: '12px 0 4px 0', fontSize: '1.1em', fontWeight: 'bold' }}>
                      {children}
                    </h3>
                  ),
                  code: ({ inline, className, children, ...props }) => {
                    if (inline) {
                      return (
                        <code
                          style={{
                            backgroundColor: '#434343',
                            color: '#ffffff',
                            padding: '2px 4px',
                            borderRadius: '3px',
                            fontSize: '0.9em',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    return (
                      <pre
                        style={{
                          backgroundColor: '#1a1a1a',
                          color: '#ffffff',
                          padding: '12px',
                          borderRadius: '6px',
                          overflow: 'auto',
                          margin: '8px 0',
                          border: '1px solid #434343',
                          display: 'block'
                        }}
                      >
                        <code
                          style={{
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                            fontSize: '0.9em',
                            color: '#ffffff'
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      </pre>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote
                      style={{
                        borderLeft: '4px solid #ddd',
                        paddingLeft: '12px',
                        margin: '8px 0',
                        fontStyle: 'italic',
                        color: '#666'
                      }}
                    >
                      {children}
                    </blockquote>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ margin: '2px 0', lineHeight: '1.5' }}>
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: 'bold' }}>
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ fontStyle: 'italic' }}>
                      {children}
                    </em>
                  )
                }}
              >
                {contentToShow}
              </ReactMarkdown>
              
              {/* 流式输出光标 */}
              {shouldUseTypewriter && (isTyping || isStreaming) && (
                <span 
                  className="streaming-cursor"
                  style={{
                    display: 'inline-block',
                    width: '2px',
                    height: '1.2em',
                    backgroundColor: '#1890ff',
                    marginLeft: '2px',
                    animation: 'blink 1s infinite'
                  }}
                />
              )}
            </div>
          ) : (
            // 用户消息直接显示
            contentToShow
          )}
        </div>
        
        {/* 时间戳、状态和Token显示 - 合并在同一行 */}
        {(message.timestamp || getStatusText() || (!isThinking && (message.tokensUsed !== undefined || message.estimatedTokens))) && (
          <div
            style={{
              marginTop: '4px',
              fontSize: '11px',
              opacity: 0.6,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            {/* 左侧：时间戳 */}
            <div style={{ textAlign: isUser ? 'right' : 'left' }}>
              {message.timestamp && new Date(message.timestamp).toLocaleTimeString()}
            </div>
            
            {/* 右侧：状态和Token */}
            <div
              style={{
                fontSize: '10px',
                color: isUser ? 'rgba(255, 255, 255, 0.7)' : (isError ? 'rgba(140, 140, 140, 0.7)' : 'rgba(255, 255, 255, 0.6)'),
                fontWeight: '500',
                userSelect: 'none',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {/* 状态显示 */}
              {getStatusText() && (
                <span style={{ opacity: 0.8 }}>
                  [{getStatusText()}]
                </span>
              )}
              
              {/* Token显示 */}
              {!isThinking && (message.tokensUsed !== undefined || message.estimatedTokens) && (
                <span
                  style={{
                    opacity: message.estimatedTokens && message.tokensUsed === undefined ? 0.6 : 1,
                    fontStyle: message.estimatedTokens && message.tokensUsed === undefined ? 'italic' : 'normal'
                  }}
                  title={`${
                    message.tokensUsed !== undefined
                      ? `消耗了 ${message.tokensUsed} tokens` 
                      : `估算消耗 ${message.estimatedTokens} tokens`
                  }`}
                >
                  {message.tokensUsed !== undefined ? message.tokensUsed : message.estimatedTokens}
                  {message.estimatedTokens && message.tokensUsed === undefined ? '~t' : 't'}
                </span>
              )}
            </div>
          </div>
        )}
        {/* 计时器显示 - 在消息卡片外侧右下角 */}
      { (isThinking && message.type === 'thinking') && (
        <div
          style={{
            position: 'absolute',
            right: '0',
            bottom: '0',
            transform: 'translate(100%, 0)',
            fontSize: '12px',
            padding: '0px 8px',
            lineHeight: 1,
            color: 'rgba(107, 107, 107, 0.7)',
            userSelect: 'none',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {elapsedTime}s
        </div>
      )}
      </div>
      
      
      {/* 用户头像 - 只在右侧显示 */}
      {isUser && (
        <Avatar
          icon={<UserOutlined />}
          style={{
            backgroundColor: '#1890ff',
            marginLeft: '12px',
            flexShrink: 0
          }}
        />
      )}
    </div>
  );
};

export default MessageItem;
import React, { useState, useRef, useEffect } from 'react';
import {
  Typography,
  message
} from 'antd';
import { useToken } from '../contexts/TokenContext';
import api from '../services/api';
import SessionSidebar from '../components/SessionSidebar';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { STREAM_STATUS, STREAM_STATUS_DESCRIPTIONS } from '../constants/streamStatus';
import AIToolbar from '../components/AIToolbar';
import { compressImages } from '../utils/imageCompression';

const { Title } = Typography;

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { updateBalance } = useToken();



  // 工具点击处理函数
  const handleToolClick = (toolKey) => {
    switch (toolKey) {
      case 'figurine':
        // message.info('正在生成手办，请稍候...');
        break;
      case 'faceSwap':
        // message.info('正在处理换脸，请稍候...');
        break;
      case 'clothingSwap':
        // message.info('正在处理换衣，请稍候...');
        break;
      case 'poseChange':
        // message.info('正在改变姿势，请稍候...');
        break;
      default:
        break;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  // 加载会话列表
  const loadSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await api.getSessions();
      setSessions(response.data.sessions);
      
      // 如果没有当前会话且有会话列表，选择第一个
      if (!currentSessionId && response.data.sessions.length > 0) {
        setCurrentSessionId(response.data.sessions[0].id);
        loadSessionMessages(response.data.sessions[0].id);
      }
    } catch (error) {
      console.error('加载会话列表失败:', error);
      message.error('加载会话列表失败');
    } finally {
      setSessionsLoading(false);
    }
  };

  // 加载指定会话的消息
  const loadSessionMessages = async (sessionId) => {
    try {
      const response = await api.getSessionMessages(sessionId, 1, 50);
      const historyMessages = [];
      
      response.data.messages.forEach(msg => {
        // 添加用户消息
        if (msg.userMessage) {
          historyMessages.push({
            id: `${msg.id}-user`,
            type: msg.type,
            content: msg.userMessage,
            imageUrl: msg.imageUrl,
            timestamp: new Date(msg.createdAt),
            role: 'user'
          });
        }
        
        // 添加AI回复（根据streamStatus处理）
        if (msg.aiResponse) {
          historyMessages.push({
            id: `${msg.id}-ai`,
            type: msg.type,
            content: msg.aiResponse,
            tokensUsed: msg.tokensUsed,
            timestamp: new Date(msg.createdAt),
            role: 'assistant',
            isError: msg.streamStatus === STREAM_STATUS.ERROR,
            isInterrupted: msg.streamStatus === STREAM_STATUS.INTERRUPTED,
            isPending: msg.streamStatus === STREAM_STATUS.PENDING,
            streamStatus: msg.streamStatus
          });
        } else {
          // 处理没有回复的情况
          const statusContent = STREAM_STATUS_DESCRIPTIONS[msg.streamStatus] || '无回复';
          
          historyMessages.push({
            id: `${msg.id}-${msg.streamStatus}`,
            type: msg.streamStatus || 'noword',
            content: statusContent,
            timestamp: new Date(msg.createdAt),
            role: 'assistant',
            isError: msg.streamStatus === STREAM_STATUS.ERROR,
            isInterrupted: msg.streamStatus === STREAM_STATUS.INTERRUPTED,
            isPending: msg.streamStatus === STREAM_STATUS.PENDING,
            streamStatus: msg.streamStatus
          });
        }
      });
      
      setMessages(historyMessages);
    } catch (error) {
      console.error('加载会话消息失败:', error);
      message.error('加载会话消息失败');
    }
  };

  // 处理会话切换
  const handleSessionSwitch = (sessionId, newMessages = null) => {
    if (sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId);
      if (newMessages !== null) {
        setMessages(newMessages);
      } else if (sessionId) {
        loadSessionMessages(sessionId);
      }
    }
  };

  const handleSendMessage = async () => {
    // 修改验证逻辑
    if (loading) {
      return;
    }
    
    // 如果有图片但没有文字描述，提示用户
    if (selectedImages.length > 0 && !inputValue.trim()) {
      message.warning('请输入对图片的分析要求或描述');
      return;
    }
    
    // 如果既没有文字也没有图片，直接返回
    if (!inputValue.trim() && selectedImages.length === 0) {
      return;
    }

    // 如果没有当前会话，先创建一个
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const response = await api.createSession();
        sessionId = response.data.id;
        setCurrentSessionId(sessionId);
        setSessions(prev => [response.data, ...prev]);
      } catch (error) {
        message.error('创建会话失败');
        return;
      }
    }
  
    const messageText = inputValue.trim();
    const images = [...selectedImages];
    
    setInputValue('');
    setSelectedImages([]);
    setLoading(true);
  
    try {
      if (images.length > 0) {
        // 图片消息改为流式处理
        const newMessage = {
          id: Date.now(),
          type: 'image',
          content: messageText,
          imageUrl: URL.createObjectURL(images[0]),
          timestamp: new Date(),
          role: 'user'
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // 创建思考中的临时消息
        const thinkingMessageId = Date.now() + 1;
        const thinkingMessage = {
          id: thinkingMessageId,
          type: 'thinking',
          content: '正在分析图片...',
          timestamp: new Date(),
          role: 'assistant',
          isThinking: true
        };
        
        setMessages(prev => [...prev, thinkingMessage]);
        
        // 使用流式图片API
        await api.sendImageMessageStream(
          messageText,
          images[0],
          sessionId,
          // onChunk - 接收到字符时
          (chunk, estimatedTokens) => {
            setMessages(prev => {
              // 移除思考消息
              const filteredMessages = prev.filter(msg => msg.id !== thinkingMessageId);
              
              // 查找是否已有AI回复消息
              const aiMessageId = thinkingMessageId + 1;
              const existingAiMessage = filteredMessages.find(msg => msg.id === aiMessageId);
              
              if (existingAiMessage) {
                // 更新现有AI消息
                return filteredMessages.map(msg => 
                  msg.id === aiMessageId
                    ? { 
                        ...msg, 
                        content: msg.content + chunk,
                        estimatedTokens: estimatedTokens
                      }
                    : msg
                );
              } else {
                // 创建新的AI回复消息
                const aiMessage = {
                  id: aiMessageId,
                  type: 'text',
                  content: chunk,
                  timestamp: new Date(),
                  role: 'assistant',
                  isStreaming: true,
                  isNewMessage: true,
                  estimatedTokens: estimatedTokens
                };
                return [...filteredMessages, aiMessage];
              }
            });
          },
          // onComplete - 完成时
          async (data) => {
            const aiMessageId = thinkingMessageId + 1;
            setMessages(prev => {
              const filteredMessages = prev.filter(msg => msg.id !== thinkingMessageId);
              return filteredMessages.map(msg => 
                msg.id === aiMessageId
                  ? { 
                      ...msg, 
                      isStreaming: false,
                      tokensUsed: data.tokensUsed,  // 修改：从 data.tokensUsed 获取
                      estimatedTokens: undefined
                    }
                  : msg
              );
            });
            updateBalance(data.remainingBalance);  // ✅ 正确使用 remainingBalance
            
            // 如果有生成的标题，直接更新当前会话列表中的标题
            if (data.title) {
              setSessions(prev => prev.map(session => 
                session.id === sessionId 
                  ? { ...session, title: data.title }
                  : session
              ));
            }
            
            setLoading(false);
            if (!data.title) {
              loadSessions();
            }
          },
          // onError - 错误时
          (error) => {
            message.error(error);
            // 移除思考消息，创建错误提示消息
            setMessages(prev => {
              const filteredMessages = prev.filter(msg => msg.id !== thinkingMessageId);
              
              const errorMessage = {
                id: thinkingMessageId + 1,
                type: 'error',
                content: error || '图片分析失败，请稍后重试。',
                timestamp: new Date(),
                role: 'assistant',
                isError: true,
              };
              return [...filteredMessages, errorMessage];
            });
            setLoading(false);
          }
        );
      } else {
        // 在 handleSendMessage 方法中，大约在第 170-180 行之间
        // 文本消息使用流式处理
        const newMessage = {
          id: Date.now(),
          type: 'text',
          content: messageText,
          timestamp: new Date(),
          role: 'user'
        };
        
        setMessages(prev => [...prev, newMessage]);
        
        // 创建思考中的临时消息
        const thinkingMessageId = Date.now() + 1;
        const thinkingMessage = {
          id: thinkingMessageId,
          type: 'thinking',
          content: '正在思考中...',
          timestamp: new Date(),
          role: 'assistant',
          isThinking: true
        };
        
        setMessages(prev => [...prev, thinkingMessage]);
        
        
        // 使用流式API
        await api.sendTextMessageStream(
          messageText,
          sessionId,
          // onChunk - 接收到字符时
          (chunk, estimatedTokens) => {
            setMessages((prev) => {
              // 移除思考消息
              const filteredMessages = prev.filter(
                (msg) => msg.id !== thinkingMessageId
              );

              // 查找是否已有AI回复消息
              const aiMessageId = thinkingMessageId + 1;
              const existingAiMessage = filteredMessages.find(
                (msg) => msg.id === aiMessageId
              );

              if (existingAiMessage) {
                // 更新现有AI消息
                return filteredMessages.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        content: msg.content + chunk,
                        estimatedTokens: estimatedTokens,
                      }
                    : msg
                );
              } else {
                // 创建新的AI回复消息
                const aiMessage = {
                  id: aiMessageId,
                  type: "text",
                  content: chunk,
                  timestamp: new Date(),
                  role: "assistant",
                  isStreaming: true,
                  isNewMessage: true, // 标识为新消息，触发打字机效果
                  estimatedTokens: estimatedTokens,
                };
                return [...filteredMessages, aiMessage];
              }
            });
          },
          // onComplete - 完成时
          async (data) => {
            const aiMessageId = thinkingMessageId + 1;
            setMessages((prev) => {
              const filteredMessages = prev.filter(
                (msg) => msg.id !== thinkingMessageId
              );
              return filteredMessages.map((msg) =>
                msg.id === aiMessageId
                  ? {
                      ...msg,
                      isStreaming: false,
                      tokensUsed: data.tokensUsed,
                      estimatedTokens: undefined,
                    }
                  : msg
              );
            });
            updateBalance(data.remainingBalance);

            // 如果有生成的标题，直接更新当前会话列表中的标题
            if (data.title) {
              setSessions((prev) =>
                prev.map((session) =>
                  session.id === sessionId
                    ? { ...session, title: data.title }
                    : session
                )
              );
            }

            // 更新session的消息计数
            setSessions((prev) =>
              prev.map((session) =>
                session.id === sessionId
                  ? {
                      ...session,
                      messageCount: (session.messageCount || 0) + 1,
                      lastMessageAt: new Date().toISOString(),
                    }
                  : session
              )
            );

            setLoading(false);
            // 移除条件判断，确保session列表始终是最新的
            // if (!data.title) {
            //   loadSessions();
            // }
          },
          // onError - 错误时
          (error) => {
            message.error(error);
            // 移除思考消息，创建错误提示消息
            setMessages((prev) => {
              const filteredMessages = prev.filter(
                (msg) => msg.id !== thinkingMessageId
              );

              // 创建错误提示消息
              const errorMessage = {
                id: thinkingMessageId + 1,
                type: "error",
                content: "可能正在处理大量请求，请稍后重试。",
                timestamp: new Date(),
                role: "assistant",
                isError: true,
                tokensUsed: 0,
              };

              return [...filteredMessages, errorMessage];
            });

            setLoading(false);
          }
        );
      }
      
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error(error.response?.data?.error || '发送消息失败，请重试');
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0) {
      const newImages = imageFiles.slice(0, 4 - selectedImages.length);
      
      // 检查是否需要压缩
      const needCompression = newImages.some(file => file.size > 500 * 1024);
      
      if (needCompression) {
        try {
          message.loading('正在压缩图片...', 0);
          const compressedFiles = await compressImages(newImages, 500);
          setSelectedImages(prev => [...prev, ...compressedFiles]);
          message.destroy();
          message.success('图片压缩完成');
        } catch (error) {
          message.destroy();
          message.error('图片压缩失败');
        }
      } else {
        setSelectedImages(prev => [...prev, ...newImages]);
      }
      
      if (imageFiles.length > 4 - selectedImages.length) {
        message.warning('最多只能上传4张图片');
      }
    }
  };

    // 处理从AIToolbar传来的图片上传（带清除功能）
    const handleToolbarImageUpload = (imageFiles, shouldClear = true) => {
      // 如果需要清除，先清空已有图片
      if (shouldClear) {
        setSelectedImages([]);
      }
      
      // 添加新图片
      const newImages = imageFiles.slice(0, 4);
      setSelectedImages(newImages);
      
      if (imageFiles.length > 4) {
        message.warning('最多只能上传4张图片');
      }
    };

  return (
    <div style={{ 
      display: 'flex', 
      backgroundColor: '#141414',
    }}>
      {/* 左侧会话列表侧边栏 - 现在是固定定位 */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        sessionsLoading={sessionsLoading}
        onSessionSwitch={handleSessionSwitch}
        onSessionsUpdate={setSessions} 
      />      
      
      {/* 右侧聊天区域 - 上下结构布局 */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: 'calc(100vh - 70px)',
        overflow: 'hidden' // 防止出现滚动条
      }}>
        
        {/* 上方：聊天消息区域 */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0 // 确保flex子元素可以收缩
        }}>
          <MessageList
            messages={messages}
            loading={loading}
            currentSessionId={currentSessionId}
            messagesEndRef={messagesEndRef}
          />
        </div>
        
        {/* 下方：输入框区域 */}
        <div style={{
          flexShrink: 0,
          position: 'relative' // 添加相对定位，为工具条提供定位基准
        }}>
          {/* AI工具条 */}
          <AIToolbar 
            onToolClick={handleToolClick} 
            selectedImages={selectedImages}
            setInputValue={setInputValue}
            inputValue={inputValue}
            onImageUpload={handleToolbarImageUpload}
          />
          
          <MessageInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
            loading={loading}
            isDragOver={isDragOver}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        </div>
      </div>
    </div>
  );
};

export default Chat;
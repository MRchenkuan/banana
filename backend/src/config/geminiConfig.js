// Gemini API 配置文件
const GEMINI_CONFIG = {
  models: {
    text: 'gemini-2.5-flash',
    image: 'gemini-2.5-flash-image-preview',
    title: 'gemini-2.5-flash'
  },

  // 文本生成配置
  textGeneration: {
    model: 'gemini-2.5-flash',
    MaxChatHistoryLength:50,
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // 禁用思考模式
      },
      temperature: 1,
      safetySettings: [
          {
            // 仇恨言论检测
            category: 'HARM_CATEGORY_HARASSMENT',
            // 阻止中等及以上风险的内容
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 危险内容检测
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 骚扰内容检测
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 性暴露内容检测
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          },
          {
            // 性暴露内容检测
            category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
            threshold: 'BLOCK_ONLY_HIGH'
          }
          // 移除了以下无效的图片专用安全类别：
          // HARM_CATEGORY_IMAGE_HATE
          // HARM_CATEGORY_IMAGE_DANGEROUS_CONTENT
          // HARM_CATEGORY_IMAGE_HARASSMENT
          // HARM_CATEGORY_IMAGE_SEXUALLY_EXPLICIT
        ],
    }
  },

  // 标题生成配置
  titleGeneration: {
    model: 'gemini-2.5-flash',
    config: {
      thinkingConfig: {
        thinkingBudget: 0, // 禁用思考模式
      },
      temperature: 1,
      maxOutputTokens: 20,
    },
    // 标题生成的提示词模板
    promptTemplate: '请根据以下对话内容，生成一个简洁的标题（不超过15个字符）：\n\n{conversationContext}\n\n',
    // 标题处理规则
    processing: {
      maxLength: 20,
      truncateLength: 17,
      removePatterns: [
        /^[\"'《】\[\(]*/,  // 移除开头的引号和括号
        /[\"'》】\]\)]*$/,  // 移除结尾的引号和括号
        /^标题[：:]*/       // 移除"标题:"前缀
      ],
      defaultTitle: '新对话'
    }
  },

  // 图片生成配置
  imageGeneration: {
    model: 'gemini-2.5-flash-image-preview',
    config: {
      temperature: 0.8,
      maxOutputTokens: 4096,
      topP: 0.9
    }
  },

  // 图片到图片生成配置
  imageToImageGeneration: {
    model: 'gemini-2.5-flash-image-preview',
    config: {
      temperature: 1,
      maxOutputTokens: 4096,
      topP: 0.9
    }
  },

  // 流式输出配置
  streaming: {
    enabled: true,
    chunkDelay: 50, // 毫秒
    sentenceSplitPattern: /(?<=[.!?。！？])\s*/
  },

  // 图片处理配置
  imageProcessing: {
    sizeThreshold: {
      small: 500 * 1024,    // 500KB
      medium: 1024 * 1024,  // 1MB
      large: 2048 * 1024    // 2MB
    },
    mimeTypes: {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff'
    },
    defaultMimeType: 'image/jpeg',
    tempDir: '../../temp',
    fallbackToLocal: true
  },

  // 内存优化配置
  memoryOptimization: {
    enabled: true,
    thresholds: {
      high: 0.8,    // 内存使用率超过80%时使用小阈值
      low: 0.5      // 内存使用率低于50%时使用大阈值
    },
    adaptiveThresholds: {
      high: 500 * 1024,   // 高内存压力时的阈值
      normal: 1024 * 1024, // 正常情况下的阈值
      low: 2048 * 1024     // 低内存压力时的阈值
    }
  },

  // 错误处理配置
  errorHandling: {
    retryAttempts: 3,
    retryDelay: 1000, // 毫秒
    fallbackMessages: {
      textGeneration: '文本生成服务暂时不可用，请稍后重试',
      imageGeneration: '图片生成服务暂时不可用，请稍后重试',
      titleGeneration: '新对话'
    }
  }
};

module.exports = GEMINI_CONFIG;
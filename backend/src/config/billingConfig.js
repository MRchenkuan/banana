const BILLING_CONFIG = {
  // 文本处理计费标准
  text: {
    // 基础文本处理（每1000字符）
    basic: {
      tokensPerKChar: 750, // 每1000字符消耗750 tokens
      minTokens: 10,       // 最小消耗10 tokens
      maxTokens: 10000     // 单次最大消耗10000 tokens
    },
    // 高级文本处理（如代码生成、复杂分析）
    advanced: {
      tokensPerKChar: 1200,
      minTokens: 50,
      maxTokens: 20000
    }
  },

  // 图片处理计费标准
  image: {
    // 图片分析
    analysis: {
      baseTokens: 150,     // 基础消耗150 tokens
      perMBTokens: 100,    // 每MB额外消耗100 tokens
      maxTokens: 2000      // 单张图片最大消耗2000 tokens
    },
    // 图片生成
    generation: {
      baseTokens: 500,     // 基础消耗500 tokens
      qualityMultiplier: {
        low: 1.0,
        medium: 1.5,
        high: 2.0,
        ultra: 3.0
      },
      sizeMultiplier: {
        '512x512': 1.0,
        '1024x1024': 2.0,
        '1536x1536': 3.0,
        '2048x2048': 4.0
      }
    },
    // 图片编辑
    editing: {
      baseTokens: 300,
      perOperationTokens: 100
    }
  },

  // 特殊操作计费
  special: {
    // 文件上传处理
    fileUpload: {
      perMBTokens: 50,
      maxTokens: 1000
    },
    // 长对话上下文
    contextWindow: {
      perKTokensInContext: 10, // 每1000 tokens上下文消耗10 tokens
      maxContextTokens: 50000
    }
  },

  // 用户等级计费折扣
  userTiers: {
    free: {
      discount: 0,         // 无折扣
      dailyLimit: 10000,   // 每日限额10000 tokens
      monthlyLimit: 100000 // 每月限额100000 tokens
    },
    premium: {
      discount: 0.1,       // 9折
      dailyLimit: 50000,
      monthlyLimit: 1000000
    },
    enterprise: {
      discount: 0.2,       // 8折
      dailyLimit: -1,      // 无限制
      monthlyLimit: -1
    }
  },

  // 批量操作折扣
  batchDiscount: {
    threshold: 10,       // 10次以上操作
    discount: 0.05       // 5%折扣
  }
};

module.exports = BILLING_CONFIG;
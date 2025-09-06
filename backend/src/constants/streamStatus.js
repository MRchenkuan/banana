/**
 * 流式聊天状态枚举
 */
const STREAM_STATUS = {
  PENDING: 'pending',        // 等待中
  STREAMING: 'streaming',    // 流式输出中
  COMPLETED: 'completed',    // 已完成
  INTERRUPTED: 'interrupted', // 已中断
  ERROR: 'error'             // 错误
};

// 获取所有状态值的数组（用于数据库枚举定义）
const STREAM_STATUS_VALUES = Object.values(STREAM_STATUS);

// 状态描述映射
const STREAM_STATUS_DESCRIPTIONS = {
  [STREAM_STATUS.PENDING]: '等待中',
  [STREAM_STATUS.STREAMING]: '回复中',
  [STREAM_STATUS.COMPLETED]: '已完成',
  [STREAM_STATUS.INTERRUPTED]: '已中断',
  [STREAM_STATUS.ERROR]: '回复出错'
};

module.exports = {
  STREAM_STATUS,
  STREAM_STATUS_VALUES,
  STREAM_STATUS_DESCRIPTIONS
};
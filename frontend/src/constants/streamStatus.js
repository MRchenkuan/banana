/**
 * 流式聊天状态枚举
 */
export const STREAM_STATUS = {
  PENDING: 'pending',        // 等待中
  STREAMING: 'streaming',    // 流式输出中
  COMPLETED: 'completed',    // 已完成
  INTERRUPTED: 'interrupted', // 已中断
  ERROR: 'error'             // 错误
};

// 状态描述映射
export const STREAM_STATUS_DESCRIPTIONS = {
  [STREAM_STATUS.PENDING]: '回复等待中',
  [STREAM_STATUS.STREAMING]: '回复中',
  [STREAM_STATUS.COMPLETED]: '已完成',
  [STREAM_STATUS.INTERRUPTED]: '回复已中断',
  [STREAM_STATUS.ERROR]: '回复出错'
};

// 检查是否为有效的流状态
export const isValidStreamStatus = (status) => {
  return Object.values(STREAM_STATUS).includes(status);
};

// 获取状态描述
export const getStreamStatusDescription = (status) => {
  return STREAM_STATUS_DESCRIPTIONS[status] || '未知状态';
};
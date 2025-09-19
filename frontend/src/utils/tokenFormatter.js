/**
 * 格式化token数值为k单位
 * @param {number} tokenCount - token数量
 * @returns {string} 格式化后的字符串，如 "1.23k"
 */
export const formatTokensToK = (tokenCount, fixed = 2) => {
  if (!tokenCount || tokenCount === 0) {
    return '0.01k'; // 最小显示0.01k
  }
  
  const kValue = tokenCount / 1000;
  
  // 如果小于0.01k，显示0.01k
  if (kValue < 0.01) {
    return '0.01k';
  }
  
  // 保留两位小数
  return `${kValue.toFixed(fixed)}k`;
};

/**
 * 格式化token对象为k单位显示
 * @param {Object} tokenData - token数据对象
 * @returns {Object} 格式化后的对象
 */
export const formatTokenDataToK = (tokenData) => {
  if (!tokenData || typeof tokenData !== 'object') {
    return null;
  }
  
  return {
    ...tokenData,
    total: formatTokensToK(tokenData.total),
    input: formatTokensToK(tokenData.input),
    output: formatTokensToK(tokenData.output),
    prompt: formatTokensToK(tokenData.prompt),
    completion: formatTokensToK(tokenData.completion)
  };
};
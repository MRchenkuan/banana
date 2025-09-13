const getPayMount = (amount)=>{
  const dev = true;
  if(dev){
    return (amount / 1000).toFixed(2);
  }
  return amount
}
/**
 * 套餐配置文件
 */
const PACKAGE_CONFIG = {
  packages: [
    {
      id: 'basic',
      name: '基础套餐',
      tokens: 10000,
      amount: getPayMount(9.9),
      description: '适合轻度使用场景，包含10000 tokens'
    },
    {
      id: 'standard',
      name: '标准套餐',
      tokens: 50000,
      amount: getPayMount(39.9),
      description: '适合日常使用场景，包含50000 tokens'
    },
    {
      id: 'premium',
      name: '高级套餐',
      tokens: 130000,
      amount: getPayMount(99.9),
      description: '适合重度使用场景，包含140000 tokens'
    }
  ],

  // 获取套餐信息
  getPackageById: function(id) {
    return this.packages.find(pkg => pkg.id === id);
  },

  // 验证套餐金额
  validatePackageAmount: function(id, amount) {
    const pkg = this.getPackageById(id);
    return pkg && Math.abs(pkg.amount - amount) < 0.01; // 考虑浮点数精度
  }
};

module.exports = PACKAGE_CONFIG;
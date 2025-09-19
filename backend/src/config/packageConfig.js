const getPayMount = (amount)=>{
  const dev = false;
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
      name: '中杯',
      tokens: 15000,
      amount: 5,
      // description: '可绘制约 5-10 张图'
    },
    {
      id: 'standard',
      name: '大杯',
      tokens: 70000,
      amount: 20,
      // description: '可绘制约 20-50 张图'
    },
    {
      id: 'premium',
      name: '超大杯',
      tokens: 320000,
      amount: 88,
      // description: '可绘制约 88-200 张图'
    },
    {
      id: 'enterprise',
      name: '巨大杯',
      tokens: 730000,
      amount: 198,
      // description: '可绘制约 240-500 张图'
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
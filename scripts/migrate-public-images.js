const { uploadPublicImages } = require('./upload-public-images');
const { updateImageReferences } = require('./update-image-references');

async function migratePublicImages() {
  console.log('🚀 开始迁移前端公共图片到ROS...');
  
  try {
    // 1. 上传图片到ROS
    console.log('\n📤 步骤1: 上传图片到ROS');
    await uploadPublicImages();
    
    // 2. 更新代码引用
    console.log('\n📝 步骤2: 更新代码中的图片引用');
    updateImageReferences();
    
    console.log('\n🎉 迁移完成！');
    console.log('\n📋 后续步骤:');
    console.log('1. 检查前端应用是否正常显示图片');
    console.log('2. 测试完成后可以删除 frontend/public/images/ 目录');
    console.log('3. 更新构建脚本，避免打包不必要的图片文件');
    
  } catch (error) {
    console.error('❌ 迁移过程中出错:', error);
  }
}

if (require.main === module) {
  migratePublicImages();
}

module.exports = { migratePublicImages };
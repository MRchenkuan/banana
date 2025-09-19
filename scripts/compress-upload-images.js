const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const rosService = require('../backend/src/services/file_process/RosService');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// 源目录和目标前缀
const sourceDir = path.join(__dirname, '../temp/public');
const targetPrefix = 'tool-images';

async function compressAndUploadImages() {
  console.log('🚀 开始压缩并上传图片到ROS...');
  
  try {
    // 获取目录中的所有文件
    const files = fs.readdirSync(sourceDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    console.log(`找到 ${imageFiles.length} 个图片文件`);
    
    // 上传结果记录
    const results = [];
    
    // 处理每个图片
    for (const file of imageFiles) {
      const filePath = path.join(sourceDir, file);
      console.log(`处理图片: ${file}`);
      
      try {
        // 读取图片
        const buffer = fs.readFileSync(filePath);
        
        // 使用sharp压缩图片
        const compressedBuffer = await sharp(buffer)
          .resize(800) // 限制最大宽度为800px
          .webp({ quality: 80 }) // 转换为webp格式，质量80%
          .toBuffer();
        
        console.log(`压缩前: ${buffer.length} 字节, 压缩后: ${compressedBuffer.length} 字节`);
        
        // 生成ROS key
        const rosKey = rosService.generateImageKey(file, targetPrefix);
        
        // 上传到ROS
        const uploadResult = await rosService.uploadBuffer(compressedBuffer, rosKey, {
          contentType: 'image/webp'
        });
        
        console.log(`上传成功: ${uploadResult.url}`);
        
        // 记录结果
        results.push({
          originalFile: file,
          rosUrl: uploadResult.url,
          originalSize: buffer.length,
          compressedSize: compressedBuffer.length,
          compressionRatio: Math.round((1 - compressedBuffer.length / buffer.length) * 100)
        });
      } catch (error) {
        console.error(`处理图片 ${file} 失败:`, error);
      }
    }
    
    // 输出结果摘要
    console.log('\n📊 上传结果摘要:');
    console.log('----------------------------------------');
    results.forEach(result => {
      console.log(`${result.originalFile} -> ${result.rosUrl}`);
      console.log(`压缩率: ${result.compressionRatio}%, ${(result.originalSize/1024).toFixed(1)}KB -> ${(result.compressedSize/1024).toFixed(1)}KB`);
      console.log('----------------------------------------');
    });
    
    console.log('\n🎉 处理完成！');
    
  } catch (error) {
    console.error('❌ 处理过程中出错:', error);
  }
}

// 执行脚本
if (require.main === module) {
  compressAndUploadImages();
}

module.exports = { compressAndUploadImages };
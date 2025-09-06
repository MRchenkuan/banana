const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 配置雨云ROS客户端
const s3 = new AWS.S3({
  endpoint: process.env.ROS_ENDPOINT,
  accessKeyId: process.env.ROS_ACCESS_KEY_ID,
  secretAccessKey: process.env.ROS_SECRET_ACCESS_KEY,
  region: process.env.ROS_REGION,
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
});

const bucketName = process.env.ROS_BUCKET_NAME;

async function testROS() {
  console.log('🚀 开始测试雨云ROS连接...');
  console.log('配置信息:');
  console.log('- Endpoint:', process.env.ROS_ENDPOINT);
  console.log('- Bucket:', bucketName);
  console.log('- Region:', process.env.ROS_REGION);
  console.log('- Access Key ID:', process.env.ROS_ACCESS_KEY_ID?.substring(0, 8) + '...');
  console.log('');

  try {
    // 1. 测试存储桶是否存在
    console.log('📦 测试存储桶访问...');
    await s3.headBucket({ Bucket: bucketName }).promise();
    console.log('✅ 存储桶访问成功');

    // 2. 创建测试文件
    const testContent = `ROS测试文件\n创建时间: ${new Date().toISOString()}\n随机数: ${Math.random()}`;
    const testKey = `test/ros-test-${Date.now()}.txt`;
    
    console.log('📤 测试文件上传...');
    const uploadResult = await s3.upload({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    }).promise();
    
    console.log('✅ 文件上传成功');
    console.log('- Key:', uploadResult.Key);
    console.log('- Location:', uploadResult.Location);
    console.log('- ETag:', uploadResult.ETag);

    // 3. 测试文件读取
    console.log('📥 测试文件下载...');
    const downloadResult = await s3.getObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    
    const downloadedContent = downloadResult.Body.toString();
    console.log('✅ 文件下载成功');
    console.log('- 文件大小:', downloadResult.ContentLength, 'bytes');
    console.log('- 内容类型:', downloadResult.ContentType);
    console.log('- 文件内容:', downloadedContent);

    // 4. 测试文件列表
    console.log('📋 测试文件列表...');
    const listResult = await s3.listObjectsV2({
      Bucket: bucketName,
      Prefix: 'test/',
      MaxKeys: 10
    }).promise();
    
    console.log('✅ 文件列表获取成功');
    console.log('- 文件数量:', listResult.KeyCount);
    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log('- 最近的文件:');
      listResult.Contents.slice(0, 3).forEach(obj => {
        console.log(`  * ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`);
      });
    }

    // 5. 测试文件删除
    console.log('🗑️ 测试文件删除...');
    await s3.deleteObject({
      Bucket: bucketName,
      Key: testKey
    }).promise();
    
    console.log('✅ 文件删除成功');

    // 6. 验证文件已删除
    console.log('🔍 验证文件已删除...');
    try {
      await s3.headObject({
        Bucket: bucketName,
        Key: testKey
      }).promise();
      console.log('❌ 文件删除失败，文件仍然存在');
    } catch (error) {
      if (error.statusCode === 404) {
        console.log('✅ 文件删除验证成功');
      } else {
        throw error;
      }
    }

    console.log('');
    console.log('🎉 雨云ROS测试完成！所有功能正常');
    console.log('✅ 读写权限验证通过');
    
  } catch (error) {
    console.error('❌ ROS测试失败:', error.message);
    
    if (error.code === 'NetworkingError') {
      console.error('💡 网络连接问题，请检查:');
      console.error('   - 网络连接是否正常');
      console.error('   - ROS_ENDPOINT 是否正确');
    } else if (error.code === 'InvalidAccessKeyId') {
      console.error('💡 访问密钥问题，请检查:');
      console.error('   - ROS_ACCESS_KEY_ID 是否正确');
      console.error('   - ROS_SECRET_ACCESS_KEY 是否正确');
    } else if (error.code === 'NoSuchBucket') {
      console.error('💡 存储桶问题，请检查:');
      console.error('   - ROS_BUCKET_NAME 是否正确');
      console.error('   - 存储桶是否存在');
    } else if (error.code === 'AccessDenied') {
      console.error('💡 权限问题，请检查:');
      console.error('   - 访问密钥是否有足够权限');
      console.error('   - 存储桶策略配置');
    }
    
    console.error('\n详细错误信息:', error);
    process.exit(1);
  }
}

// 运行测试
testROS();
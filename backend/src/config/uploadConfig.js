const multer = require('multer');
const path = require('path');
const rosService = require('../services/file_process/RosService');

// 配置内存存储（临时存储到内存，然后上传到ROS）
const storage = multer.memoryStorage();

// 创建ROS上传中间件
const rosUpload = multer({ 
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 // 1MB
  },
  fileFilter: (req, file, cb) => {
    // 主要依赖 MIME 类型检查，更可靠
    const allowedMimeTypes = /^image\/(jpeg|png|gif|webp)$/;
    
    if (allowedMimeTypes.test(file.mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// ROS上传处理中间件
const handleRosUpload = async (req, res, next) => {
  if (!req.file) {
    return next();
  }
  
  try {
    console.log('开始上传文件到ROS:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
    // 使用新的安全命名策略，传入用户ID
    const userId = req.user?.userId || null;
    const rosKey = rosService.generateChatImageKey(req.file.originalname, userId);
    
    // 上传到ROS
    const uploadResult = await rosService.uploadBuffer(
      req.file.buffer, 
      rosKey, 
      {
        contentType: req.file.mimetype
      }
    );
    
    // 将ROS信息添加到req.file中，保持与原有代码兼容
    req.file.path = uploadResult.url; // 使用ROS URL作为path
    req.file.rosKey = uploadResult.key;
    req.file.rosUrl = uploadResult.url;
    req.file.location = uploadResult.location;
    
    console.log('ROS上传成功:', {
      rosKey: uploadResult.key,
      url: uploadResult.url,
      size: uploadResult.size
    });
    
    next();
  } catch (error) {
    console.error('ROS上传失败:', error);
    next(error);
  }
};

// 在array上传中也使用新的命名策略
const upload = {
  single: (fieldName) => [
    rosUpload.single(fieldName),
    handleRosUpload
  ],
  array: (fieldName, maxCount) => [
    rosUpload.array(fieldName, maxCount),
    async (req, res, next) => {
      if (!req.files || req.files.length === 0) {
        return next();
      }
      
      try {
        const userId = req.user?.userId || null;
        const uploadPromises = req.files.map(async (file) => {
          const rosKey = rosService.generateChatImageKey(file.originalname, userId);
          const uploadResult = await rosService.uploadBuffer(
            file.buffer,
            rosKey,
            { contentType: file.mimetype }
          );
          
          file.path = uploadResult.url;
          file.rosKey = uploadResult.key;
          file.rosUrl = uploadResult.url;
          file.location = uploadResult.location;
          
          return uploadResult;
        });
        
        await Promise.all(uploadPromises);
        next();
      } catch (error) {
        console.error('批量ROS上传失败:', error);
        next(error);
      }
    }
  ]
};

module.exports = { upload };
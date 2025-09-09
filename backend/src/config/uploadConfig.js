const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rosService = require('../services/file_process/RosService');

// 确保临时目录存在
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 配置内存存储（临时存储到内存，然后上传到ROS）
const storage = multer.memoryStorage();

// 配置磁盘存储（临时文件存储）
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名，避免冲突
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    let ext = '';
    
    // 如果 originalname 是 'blob' 或没有扩展名，根据 MIME 类型推断
    if (file.originalname === 'blob' || !path.extname(file.originalname)) {
      const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg', 
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/bmp': '.bmp',
        'image/svg+xml': '.svg'
      };
      ext = mimeToExt[file.mimetype] || '.jpg'; // 默认使用 .jpg
    } else {
      ext = path.extname(file.originalname);
    }
    
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    console.log('Generated temp filename:', filename, 'from mimetype:', file.mimetype);
    
    cb(null, filename);
  }
});

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

// 创建临时文件上传中间件
const tempFileUpload = multer({ 
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 2 // 最多2个文件
  },
  fileFilter: (req, file, cb) => {
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
  ],
  tempFile: {
    array: (fieldName, maxCount) => [
      tempFileUpload.array(fieldName, maxCount),
      (req, res, next) => {
        if (req.files && req.files.length > 0 && req.files.length<=2) {
          req.body[fieldName] = req.files.map(file => file.path);
        }
        next();
      }
    ]
  }
};

module.exports = { upload };
const fs = require('fs');
const path = require('path');

// 需要修改的文件列表
const filesToUpdate = [
  {
    path: 'frontend/src/components/AIToolbar.js',
    replacements: [
      {
        from: "previewImage: '/images/tool-1.png',",
        to: "previewImage: 'https://pub-image-bed.cn-nb1.rains3.com/public/images/tool-1.png',"
      }
    ]
  },
  {
    path: 'frontend/src/components/home/ImageGallery.js',
    replacements: [
      {
        from: "'/images/sample-05.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-05.png',"
      },
      {
        from: "'/images/sample-01.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-01.png',"
      },
      {
        from: "'/images/sample-02.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-02.png',"
      },
      {
        from: "'/images/sample-03.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-03.png',"
      },
      {
        from: "'/images/sample-04.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-04.png',"
      },
      {
        from: "'/images/sample-06.png',",
        to: "'https://pub-image-bed.cn-nb1.rains3.com/public/images/sample-06.png',"
      }
    ]
  },
  {
    path: 'frontend/src/components/home/HeroSection.js',
    replacements: [
      {
        from: "url(/images/banner-hero.png)",
        to: "url(https://pub-image-bed.cn-nb1.rains3.com/public/images/banner-hero.png)"
      }
    ]
  }
];

function updateImageReferences() {
  console.log('开始更新代码中的图片引用...');
  
  filesToUpdate.forEach(fileConfig => {
    const filePath = path.join(__dirname, '..', fileConfig.path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${fileConfig.path}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fileConfig.replacements.forEach(replacement => {
      if (content.includes(replacement.from)) {
        content = content.replace(replacement.from, replacement.to);
        modified = true;
        console.log(`✅ ${fileConfig.path}: ${replacement.from} -> ${replacement.to}`);
      } else {
        console.log(`⚠️  ${fileConfig.path}: 未找到 "${replacement.from}"`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`📝 已更新文件: ${fileConfig.path}`);
    }
  });
  
  console.log('\n代码更新完成！');
}

if (require.main === module) {
  updateImageReferences();
}

module.exports = { updateImageReferences };
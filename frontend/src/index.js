import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // 添加这行导入index.css
import './styles/global/variables.css';
import './styles/global/reset.css';
import './styles/global/animations.css';
import './styles/shared/antd-overrides.css';
import './styles/shared/global-utilities.css';
import App from './App';

// 导入VConsole
import VConsole from 'vconsole';

// 配置 dayjs 中文
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.locale('zh-cn');
dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

// 初始化VConsole
const isAccessFromMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let vConsole = null;

// 默认在移动设备上自动启用VConsole
if (isAccessFromMobileDevice) {
  vConsole = new VConsole();
  console.log('VConsole已启用');
}

// 手动切换VConsole的函数
window.toggleVConsole = () => {
  if (vConsole) {
    vConsole.destroy();
    vConsole = null;
    console.log('VConsole已禁用');
  } else {
    vConsole = new VConsole();
    console.log('VConsole已启用');
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
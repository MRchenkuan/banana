module.exports = {
  apps: [{
    name: 'banana-backend',
    script: 'server.js',
    instances: 'max',  // 根据 CPU 核心数自动调整实例数
    exec_mode: 'cluster',  // 使用集群模式
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: '/dev/null',    // 在容器中不需要日志文件
    out_file: '/dev/null',      // 在容器中不需要日志文件
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_restarts: 10,
    min_uptime: '5s',
    listen_timeout: 3000,
    kill_timeout: 5000,
  }]
};
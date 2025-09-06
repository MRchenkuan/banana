module.exports = {
  apps: [
    {
      name: 'banana-backend',
      script: 'backend/server.js',
      cwd: '/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'banana-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/app/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        BROWSER: 'none'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};
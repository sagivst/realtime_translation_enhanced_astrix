module.exports = {
  apps: [
    // Core monitoring services
    {
      name: 'database-api-server',
      script: '/home/azureuser/translation-app/database-api-server.js',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8083
      },
      error_file: '/home/azureuser/logs/database-api-error.log',
      out_file: '/home/azureuser/logs/database-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000
    },
    {
      name: 'monitoring-server',
      script: '/home/azureuser/translation-app/monitoring-server.js',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/azureuser/logs/monitoring-server-error.log',
      out_file: '/home/azureuser/logs/monitoring-server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'monitoring-bridge',
      script: '/home/azureuser/translation-app/monitoring-to-database-bridge.js',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/azureuser/logs/monitoring-bridge-error.log',
      out_file: '/home/azureuser/logs/monitoring-bridge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10
    },

    // Metrics emitter (if exists)
    {
      name: 'metrics-emitter',
      script: '/home/azureuser/translation-app/continuous-metrics-emitter.js',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      },
    {
      name: 'cloudflared-permanent',
      script: '/home/azureuser/translation-app/cloudflared-permanent.js',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production'
      }
    },
      error_file: '/home/azureuser/logs/metrics-emitter-error.log',
      out_file: '/home/azureuser/logs/metrics-emitter-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10,
      // Don't fail if file doesn't exist
      ignore_watch: ['node_modules'],
      kill_timeout: 3000
    },

    // Gateway services
    {
      name: 'gateway-3333',
      script: '/home/azureuser/translation-app/3333_4444__Operational/gateway-3333.js',
      cwd: '/home/azureuser/translation-app/3333_4444__Operational',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3333
      },
      error_file: '/home/azureuser/logs/gateway-3333-error.log',
      out_file: '/home/azureuser/logs/gateway-3333-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'gateway-4444',
      script: '/home/azureuser/translation-app/3333_4444__Operational/gateway-4444.js',
      cwd: '/home/azureuser/translation-app/3333_4444__Operational',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 4444
      },
      error_file: '/home/azureuser/logs/gateway-4444-error.log',
      out_file: '/home/azureuser/logs/gateway-4444-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10
    },

    // Core translation services
    {
      name: 'ari-gstreamer',
      script: '/home/azureuser/translation-app/3333_4444__Operational/ari-gstreamer-operational.js',
      cwd: '/home/azureuser/translation-app/3333_4444__Operational',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/azureuser/logs/ari-gstreamer-error.log',
      out_file: '/home/azureuser/logs/ari-gstreamer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000
    },
    {
      name: 'sttttserver',
      script: '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver/STTTTSserver.js',
      cwd: '/home/azureuser/translation-app/3333_4444__Operational/STTTTSserver',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/home/azureuser/logs/sttttserver-error.log',
      out_file: '/home/azureuser/logs/sttttserver-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000
    },

    // Cloudflare tunnel (binary, not Node.js)
    {
      name: 'cloudflared',
      script: '/home/azureuser/translation-app/cloudflared-linux-amd64',
      args: 'tunnel --config /home/azureuser/translation-app/cloudflared-config.yml run',
      cwd: '/home/azureuser/translation-app',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      interpreter: 'none',  // Important: not a Node.js script
      env: {
        // Cloudflare specific environment variables if needed
      },
      error_file: '/home/azureuser/logs/cloudflared-error.log',
      out_file: '/home/azureuser/logs/cloudflared-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      min_uptime: '10s',
      max_restarts: 10
    }
  ],

  // Deploy section for zero-downtime updates
  deploy: {
    production: {
      user: 'azureuser',
      host: '20.170.155.53',
      ref: 'origin/master',
      repo: 'git@github.com:yourusername/yourrepo.git',
      path: '/home/azureuser/translation-app',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};
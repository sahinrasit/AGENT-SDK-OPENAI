// PM2 Ecosystem Configuration for Production
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      // Main WebSocket Server
      name: 'ibtech-agent-server',
      script: './dist/server/websocket-server.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      listen_timeout: 10000,
      kill_timeout: 5000,
      wait_ready: true,

      // Health monitoring
      health_check: {
        enabled: true,
        interval: 30000,
        threshold: 3,
      },

      // Advanced features
      instance_var: 'INSTANCE_ID',
      post_update: ['pnpm install', 'pnpm build'],

      // Log rotation
      log_rotation: {
        max_size: '10M',
        retain: 30,
        compress: true,
      },
    },

    {
      // Health Check Server (separate from main app)
      name: 'ibtech-health-server',
      script: './dist/server/health-server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'development',
        PORT: 3002,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
      error_file: './logs/health-error.log',
      out_file: './logs/health-out.log',
      autorestart: true,
    },

    {
      // Metrics Exporter for Prometheus
      name: 'ibtech-metrics-exporter',
      script: './dist/monitoring/metrics-exporter.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'development',
        METRICS_PORT: 9464,
      },
      env_production: {
        NODE_ENV: 'production',
        METRICS_PORT: 9464,
      },
      error_file: './logs/metrics-error.log',
      out_file: './logs/metrics-out.log',
      autorestart: true,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/ibtech-agent.git',
      path: '/var/www/ibtech-agent',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': 'echo "Deploying to production..."',
      'post-deploy-local': 'echo "Deployment complete!"',
      ssh_options: 'StrictHostKeyChecking=no',
    },

    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:yourusername/ibtech-agent.git',
      path: '/var/www/ibtech-agent-staging',
      'post-deploy': 'pnpm install && pnpm build && pm2 reload ecosystem.config.js --env staging',
    },
  },
};

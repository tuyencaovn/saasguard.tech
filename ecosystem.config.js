module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './apps/backend',
      script: 'pnpm',
      args: 'start:dev',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3005,
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 5435,
        DATABASE_USER: 'monitor',
        DATABASE_PASSWORD: 'M0n!t0r_D3v@2025',
        DATABASE_NAME: 'bimnext_monitor',
        JWT_SECRET: 'bimnext-monitor-jwt-secret-dev-2025',
        JWT_EXPIRES_IN: '24h',
        METRICS_INTERVAL_MS: 3000,
        ALERT_COOLDOWN_MS: 300000,
      },
    },
    {
      name: 'frontend',
      cwd: './apps/frontend',
      script: 'pnpm',
      args: 'dev',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
      },
    },
  ],
};

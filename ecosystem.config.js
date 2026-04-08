/** @type {import('pm2').StartOptions[]} */
const ROOT = __dirname;

module.exports = {
  apps: [
    {
      name: 'api',
      script: 'node',
      args: 'apps/api/dist/src/main',
      cwd: ROOT,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'admin-web',
      script: 'pnpm',
      args: 'exec serve apps/admin-web/out -l 3000 --no-clipboard',
      cwd: ROOT,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'solution-web',
      script: 'pnpm',
      args: 'exec serve apps/solution-web/out -l 3002 --no-clipboard',
      cwd: ROOT,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'agent-web',
      script: 'pnpm',
      args: 'exec serve apps/agent-web/out -l 3003 --no-clipboard',
      cwd: ROOT,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};

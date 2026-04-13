/** @type {import('pm2').StartOptions[]} */
const path = require('path');
const ROOT = __dirname;
const API_ROOT = path.join(ROOT, 'apps', 'api');
const API_ENTRY = path.join(API_ROOT, 'dist', 'src', 'main.js');
/** pnpm PATH 없이도 동작하도록 node 로 직접 실행 (502 방지) */
const SERVE_CLI = path.join(ROOT, 'node_modules', 'serve', 'build', 'main.js');

function serveStaticApp(outDir, port) {
  return {
    script: 'node',
    args: [
      SERVE_CLI,
      path.join(ROOT, outDir),
      '-l',
      `tcp://127.0.0.1:${port}`,
      '-s',
      '--no-clipboard',
    ],
    cwd: ROOT,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
  };
}

module.exports = {
  apps: [
    {
      name: 'api',
      /** 확장자 없는 경로(dist/src/main)는 PM2/일부 환경에서 엔트리 인식 실패 가능 → main.js 고정 */
      script: API_ENTRY,
      cwd: API_ROOT,
      interpreter: 'node',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'admin-web',
      ...serveStaticApp('apps/admin-web/out', 3000),
    },
    {
      name: 'solution-web',
      ...serveStaticApp('apps/solution-web/out', 3002),
    },
    {
      name: 'agent-web',
      ...serveStaticApp('apps/agent-web/out', 3003),
    },
  ],
};

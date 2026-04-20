/** @type {import('pm2').StartOptions[]} */
const path = require('path');
const os = require('os');
const ROOT = __dirname;
const API_ROOT = path.join(ROOT, 'apps', 'api');
const API_ENTRY = path.join(API_ROOT, 'dist', 'src', 'main.js');
const SMS_INGEST_ROOT = path.join(ROOT, 'apps', 'sms-ingest');
const SMS_INGEST_ENTRY = path.join(SMS_INGEST_ROOT, 'dist', 'index.js');
/**
 * 정적 앱은 scripts/pm2-serve-static.sh 를 통해 띄운다.
 * 이유: serve 가 직접 EADDRINUSE 로 죽으면 좀비가 포트를 잡고 남는 사고가 있었음
 *   (2026-04-19 solution-user 가 옛 chunk 를 계속 서빙하던 사고).
 * 래퍼가 start 직전 해당 포트를 무조건 회수한 뒤 serve 를 exec 한다.
 */
const PM2_SERVE_STATIC = path.join(ROOT, 'scripts', 'pm2-serve-static.sh');
/** cloudflared 바이너리 경로 (설치 위치 우선순위: .local/bin → /usr/local/bin → /usr/bin) */
const CLOUDFLARED = [
  path.join(os.homedir(), '.local', 'bin', 'cloudflared'),
  '/usr/local/bin/cloudflared',
  '/usr/bin/cloudflared',
].find(p => { try { require('fs').accessSync(p, require('fs').constants.X_OK); return true; } catch { return false; } }) || 'cloudflared';
const CF_CONFIG = path.join(ROOT, 'deploy', 'cloudflared', 'config.yml');

function serveStaticApp(outDir, port) {
  return {
    /** bash 로 직접 실행. PM2 가 node interpreter 를 강제로 붙여 .sh 를 못 돌리는 사고 회피. */
    script: 'bash',
    args: [PM2_SERVE_STATIC, String(port), outDir],
    interpreter: 'none',
    cwd: ROOT,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    /** SIGTERM 후 충분히 기다려서 OS 가 포트를 release 하도록 */
    kill_timeout: 5000,
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
      name: 'sms-ingest',
      /** POST /webhook/sms — apps/sms-ingest/.env (DATABASE_URL, SMS_INGEST_PORT, SMS_INGEST_SECRET) */
      script: SMS_INGEST_ENTRY,
      cwd: SMS_INGEST_ROOT,
      interpreter: 'node',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'super-admin',
      ...serveStaticApp('apps/super-admin/out', 3000),
    },
    {
      name: 'solution-admin',
      ...serveStaticApp('apps/solution-admin/out', 3001),
    },
    {
      name: 'solution-user',
      ...serveStaticApp('apps/solution-user/out', 3002),
    },
    {
      name: 'solution-agent',
      ...serveStaticApp('apps/solution-agent/out', 3003),
    },
    {
      name: 'solution-main',
      ...serveStaticApp('apps/solution-main/out', 3010),
    },
    {
      name: 'cloudflared',
      script: CLOUDFLARED,
      args: ['tunnel', '--config', CF_CONFIG, 'run'],
      cwd: ROOT,
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: { NO_COLOR: '1' },
    },
  ],
};

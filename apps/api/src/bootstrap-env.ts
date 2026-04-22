import { existsSync } from 'fs';
import { config } from 'dotenv';
import { join } from 'path';

/**
 * Nest 가 모듈 그래프를 읽기 전에 .env 를 올린다.
 * pnpm/turbo 가 cwd 를 레포 루트로 두는 경우가 있어 여러 경로를 시도한다.
 */
const envCandidates = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'apps', 'api', '.env'),
  join(__dirname, '..', '..', '.env'), // dist/src → apps/api/.env
  join(__dirname, '..', '.env'), // ts-node 등에서 src 기준
];
for (const p of envCandidates) {
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}

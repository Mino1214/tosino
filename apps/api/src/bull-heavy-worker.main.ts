/**
 * API 와 분리된 Bull 워커 — 동기화·USDT 폴링·콤프 정산 스윕이 여기서만 소비된다.
 * OddsApiWsService 가 WS 자동 연결을 열지 않도록 막는다(스냅샷·ingest 는 REST 등만 사용).
 */
process.env.TOSINO_PROCESS_ROLE = 'bull-heavy-worker';
process.env.ODDS_API_WS_AUTOCONNECT = 'false';

import './bootstrap-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BullHeavyWorkerModule } from './bull-heavy-worker.module';

async function bootstrap() {
  const logger = new Logger('BullHeavyWorker');
  const app = await NestFactory.createApplicationContext(BullHeavyWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  logger.log('bull-heavy-worker 기동 (통합: sync + usdt-deposit + comp-settlement)');

  const shutdown = async (signal: string) => {
    logger.log(`${signal} 수신 — 종료 중`);
    await app.close();
    process.exit(0);
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});

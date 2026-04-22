/**
 * 워커 프로세스는 DB 스냅샷만 읽어 매처에 공급한다.
 * API 프로세스가 이미 odds-api.io WebSocket 을 열고 있으므로,
 * 여기서 OddsApiWsService.onModuleInit 가 자동 연결하지 않도록 강제로 끈다.
 * (다른 값은 .env 를 그대로 사용)
 */
process.env.ODDS_API_WS_AUTOCONNECT = 'false';

import './bootstrap-env';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { CrawlerMatcherWorkerModule } from './crawler-matcher-worker.module';

async function bootstrap() {
  const logger = new Logger('CrawlerMatcherWorker');
  const app = await NestFactory.createApplicationContext(
    CrawlerMatcherWorkerModule,
    { logger: ['error', 'warn', 'log'] },
  );
  logger.log('crawler-matcher-worker 기동 (큐 소비·주기 잡 등록)');

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

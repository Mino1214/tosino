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

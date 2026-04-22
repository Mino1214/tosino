import './bootstrap-env';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import type { IncomingMessage } from 'http';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const uploadDir =
    process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  // 스코어 크롤러가 원본 사이트에서 긁어오는 로고/국기 이미지를 로컬 캐시로 저장.
  // 로컬 경로: $ASSETS_DIR (기본 apps/api/assets) / crawler / <bucket> / <hash>.png
  // 공개 URL : /assets/crawler/... (CDN 프록시 시에도 동일 경로 유지).
  const assetsDir = process.env.ASSETS_DIR || join(process.cwd(), 'assets');
  app.useStaticAssets(assetsDir, { prefix: '/assets/' });
  // 스코어 크롤러 ingest(팀/경기 수백 건 JSON)가 기본 100kb 제한에 걸리지 않도록 여유 있게 둔다.
  const bodyLimit = process.env.JSON_BODY_LIMIT || '20mb';
  app.use(
    json({
      limit: bodyLimit,
      verify: (req: IncomingMessage, _res, buf: Buffer) => {
        (req as IncomingMessage & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: true,
    credentials: true,
  });
  /** apex(nexus001.vip)에서 Next 관리자와 경로 충돌을 피하기 위해 /api 접두사 */
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health', method: RequestMethod.GET },
      { path: 'webhooks/(.*)', method: RequestMethod.ALL },
    ],
  });
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));
  const port = Number(process.env.API_PORT || process.env.PORT || 4001);
  await app.listen(port);
}
bootstrap();

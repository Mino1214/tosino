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
  app.use(
    json({
      verify: (req: IncomingMessage, _res, buf: Buffer) => {
        (req as IncomingMessage & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ extended: true }));
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

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { json, urlencoded } from 'express';
import type { IncomingMessage } from 'http';
import { AppModule } from '../src/app.module';

/** Requires PostgreSQL, Redis, and applied migrations. Run manually when stack is up. */
describe.skip('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /public/bootstrap', async () => {
    const res = await request(app.getHttpServer()).get(
      '/public/bootstrap?host=localhost',
    );
    expect(res.status).toBe(200);
  });
});

import 'dotenv/config';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { processSmsIngest } from './process-sms';

const prisma = new PrismaClient();
const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = Number(process.env.SMS_INGEST_PORT || 4050);
/** .env 에서 줄 끝 공백·따옴표 잔여 방지 */
const SECRET = (process.env.SMS_INGEST_SECRET ?? '').trim();

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'sms-ingest',
    note: '루트는 안내용입니다. 모바일 앱 URL은 반드시 /webhook/sms 까지 포함하세요.',
    paths: {
      health: 'GET /health',
      webhook:
        'POST /webhook/sms (JSON: body 필수, secret 은 SMS_INGEST_SECRET 설정 시에만 필요)',
    },
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sms-ingest' });
});

/** 브라우저로 열었을 때 404 대신 안내 (실제 수신은 POST만) */
app.get('/webhook/sms', (_req, res) => {
  res.json({
    ok: true,
    hint: '문자 전달은 POST(JSON)만 됩니다. Flutter 설정 URL 끝이 …/webhook/sms 인지 확인하세요.',
    postBody: ['body (필수)', 'secret (서버에 비밀 설정 시)', 'sender?', 'recipientPhone?'],
  });
});

app.post('/webhook/sms', async (req, res) => {
  try {
    const out = await processSmsIngest(prisma, SECRET, req.body);
    const preview =
      typeof req.body?.body === 'string'
        ? req.body.body.slice(0, 100).replace(/\s+/g, ' ')
        : '';
    console.log('[sms-ingest] webhook', {
      ok: out.ok,
      status: out.status,
      duplicate: out.duplicate,
      message: out.message,
      bodyPreview: preview || undefined,
    });
    if (!out.ok) {
      res.status(401).json(out);
      return;
    }
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      ok: false,
      message: e instanceof Error ? e.message : 'error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`sms-ingest listening on :${PORT}`);
  if (!SECRET) {
    console.warn(
      '[sms-ingest] SMS_INGEST_SECRET 없음 → 비밀 검증 생략. 운영 전에는 설정 권장.',
    );
  }
});

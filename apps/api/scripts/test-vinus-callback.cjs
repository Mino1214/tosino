/**
 * Vinus 게임 콜백 스모크 테스트 (CommonJS — pnpm run 바로 실행)
 *
 * pnpm run vinus:callback-smoke
 *
 * 필요: apps/api/.env (DATABASE_URL, VINUS_AGENT_KEY)
 *      DB: 프로젝트 루트에서 pnpm db:migrate:deploy && pnpm db:seed
 *      API 서버 실행 중 (기본 127.0.0.1:4001)
 *      (선택) VINUS_AUTH_KEY → 요청에 authKey 헤더
 */
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { randomBytes } = require('crypto');
const { PrismaClient, UserRole } = require('@prisma/client');

function loadDotEnv() {
  const p = resolve(__dirname, '../.env');
  if (!existsSync(p)) {
    console.error('apps/api/.env 가 없습니다.');
    process.exit(1);
  }
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function makeToken() {
  const pattern =
    '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  for (let j = 0; j < 12; j++) {
    s += pattern[randomBytes(1)[0] % pattern.length];
  }
  s += String(Date.now()).slice(-8);
  return s;
}

async function main() {
  loadDotEnv();
  const agentKey = process.env.VINUS_AGENT_KEY?.trim();
  const authKey = process.env.VINUS_AUTH_KEY?.trim();
  if (!agentKey) {
    console.error('VINUS_AGENT_KEY 를 apps/api/.env 에 설정하세요.');
    process.exit(1);
  }

  const port = process.env.API_PORT || process.env.PORT || '4001';
  const base = process.env.VINUS_CALLBACK_TEST_URL || `http://127.0.0.1:${port}`;

  const prisma = new PrismaClient();
  let user;
  try {
    user = await prisma.user.findFirst({
      where: { loginId: 'user@tosino.local', role: UserRole.USER },
      include: { wallet: true },
    });
    if (!user?.wallet) {
      user = await prisma.user.findFirst({
        where: {
          role: UserRole.USER,
          platformId: { not: null },
          wallet: { isNot: null },
        },
        include: { wallet: true },
      });
    }
  } catch (e) {
    if (
      e &&
      (e.code === 'P2021' ||
        e.code === 'P1003' ||
        e.code === 'P1001' ||
        e.code === 'P1017')
    ) {
      console.error(
        'DB에 Prisma 테이블이 없거나 연결할 수 없습니다 (예: User 테이블 없음).',
      );
      console.error('프로젝트 루트에서 순서대로 실행하세요:');
      console.error('  pnpm db:migrate:deploy');
      console.error('  pnpm db:seed');
      await prisma.$disconnect();
      process.exit(1);
    }
    throw e;
  }
  if (!user?.platformId || !user.wallet) {
    console.error(
      '승인된 일반 회원·지갑이 없습니다. 프로젝트 루트에서 pnpm db:seed 를 실행하세요.',
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  const tok = makeToken();
  await prisma.vinusSessionToken.deleteMany({ where: { userId: user.id } });
  await prisma.vinusSessionToken.create({
    data: {
      userId: user.id,
      platformId: user.platformId,
      token: tok,
    },
  });
  await prisma.$disconnect();

  const body = {
    command: 'authenticate',
    data: { token: tok },
    check: '11',
  };

  const url = `${base.replace(/\/$/, '')}/webhooks/vinus`;
  console.log('POST', url);
  console.log('Body:', JSON.stringify(body));

  const headers = { 'Content-Type': 'application/json' };
  if (authKey) headers.authKey = authKey;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  console.log('Status:', res.status, res.statusText);
  try {
    console.log('Response:', JSON.stringify(JSON.parse(text), null, 2));
  } catch {
    console.log('Response (raw):', text);
  }

  if (!res.ok) process.exit(1);
  const j = JSON.parse(text);
  if (j.result !== 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

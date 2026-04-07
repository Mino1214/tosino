/**
 * Vinus 벤더 요청용: 심리스/트랜스퍼 콜백 시나리오 + 에볼루션 confirm
 *
 * 사전: DB 시드(user@tosino.local), .env 의 VINUS_AGENT_KEY, API 가동
 *
 *   pnpm run vinus:flows-smoke
 */
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { randomBytes } = require('crypto');
const { PrismaClient, UserRole, Prisma } = require('@prisma/client');

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
    '23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let j = 0; j < 12; j++) {
    s += pattern[randomBytes(1)[0] % pattern.length];
  }
  return s + String(Date.now()).slice(-8);
}

async function post(base, authKey, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authKey) headers.authKey = authKey;
  const res = await fetch(`${base.replace(/\/$/, '')}/webhooks/vinus`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text };
  }
  return { res, json };
}

function assertOk(step, json) {
  if (json.result !== 0) {
    console.error(step, 'FAIL', json);
    process.exit(1);
  }
  console.log(step, 'OK', JSON.stringify(json));
}

async function main() {
  loadDotEnv();
  const authKey = process.env.VINUS_AUTH_KEY?.trim();
  const port = process.env.API_PORT || process.env.PORT || '4001';
  const base = process.env.VINUS_CALLBACK_TEST_URL || `http://127.0.0.1:${port}`;

  const prisma = new PrismaClient();
  let user = await prisma.user.findFirst({
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
  if (!user?.platformId || !user.wallet) {
    console.error('테스트 회원·지갑 없음');
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.wallet.update({
    where: { id: user.wallet.id },
    data: { balance: new Prisma.Decimal('100000.00') },
  });

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

  const ts = Math.floor(Date.now() / 1000);
  const uid = user.id;

  let r;

  console.log('\n--- 심리스형: authenticate → balance → bet → win → confirm ---\n');
  r = await post(base, authKey, {
    command: 'authenticate',
    data: { token: tok },
    check: '11',
  });
  assertOk('authenticate', r.json);

  r = await post(base, authKey, {
    command: 'balance',
    data: { token: tok, user_id: uid },
    check: '11,22',
    timestamp: ts,
  });
  assertOk('balance', r.json);

  const betTx = `smoke-bet-${Date.now()}`;
  r = await post(base, authKey, {
    command: 'bet',
    data: {
      user_id: uid,
      transaction_id: betTx,
      game_id: 'vs33s16001',
      round_id: '188142',
      game_type: 'baccarat',
      game_sort: 'casino',
      vendor: 'evolution',
      game: 'leqdemo',
      amount: 100,
    },
    timestamp: ts,
    check: '21,22,41,31',
  });
  assertOk('bet(seamless)', r.json);

  const winTx = `smoke-win-${Date.now()}`;
  r = await post(base, authKey, {
    command: 'win',
    data: {
      user_id: uid,
      transaction_id: winTx,
      game_id: 'vs33s16001',
      round_id: '188142',
      game: 'leqdemo',
      amount: 50,
    },
    timestamp: ts,
    check: '21,22,41',
  });
  assertOk('win', r.json);

  const confirmTx = `smoke-confirm-${Date.now()}`;
  r = await post(base, authKey, {
    command: 'confirm',
    data: {
      token: tok,
      user_id: uid,
      transaction_id: confirmTx,
      game_id: 'vs33s16001',
      round_id: '188142',
      vendor: 'evolution',
    },
    check: '11,21,22',
    timestamp: ts,
  });
  assertOk('confirm(evolution)', r.json);

  r = await post(base, authKey, {
    command: 'confirm',
    data: {
      user_id: uid,
      transaction_id: confirmTx,
      game_id: 'vs33s16001',
      round_id: '188142',
      vendor: 'evolution',
    },
    check: '21,22',
    timestamp: ts,
  });
  assertOk('confirm(멱등)', r.json);

  console.log('\n--- 트랜스퍼형: bet-win + data.transfer=Y ---\n');
  const bwTx = `smoke-betwin-tf-${Date.now()}`;
  r = await post(base, authKey, {
    command: 'bet-win',
    data: {
      transfer: 'Y',
      user_id: uid,
      transaction_id: bwTx,
      vendor: 'evolution',
      game_id: 'vs33s16001',
      round_id: '188143',
      game_type: 'baccarat',
      game_sort: 'casino',
      game: 'leqdemo',
      amount: 200,
      bet: 200,
      win: 350,
    },
    timestamp: ts,
    check: '21,22,41,31',
  });
  assertOk('bet-win(transfer)', r.json);

  console.log('\n전체 시나리오 통과. 벤더 대시보드에서 콜백 URL로 실게임 연동 테스트를 이어가면 됩니다.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

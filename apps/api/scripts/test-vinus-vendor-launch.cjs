/**
 * Vinus GET /game/play-game 벤더 매트릭스: result===0 및 url 형식 확인
 *
 *   pnpm run vinus:vendor-matrix
 *
 * 사전: apps/api/.env 에 VINUS_AGENT_KEY (5자). 네트워크 필요.
 * API 서버는 띄울 필요 없음 — Vinus 게이트만 직접 호출.
 */
const { existsSync, readFileSync } = require('fs');
const { resolve } = require('path');
const { randomBytes } = require('crypto');

function loadDotEnv() {
  const p = resolve(__dirname, '../.env');
  if (!existsSync(p)) {
    console.error('apps/api/.env 가 없습니다.');
    process.exit(1);
  }
  for (const ll of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = ll.trim();
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

function isProbablyGameUrl(u) {
  try {
    const x = new URL(u);
    return x.protocol === 'http:' || x.protocol === 'https:';
  } catch {
    return false;
  }
}

/** 표시명, vendor, game (기본 lobby) */
const ROWS = [
  ['에볼루션 카지노', 'evolution', 'lobby'],
  ['넷엔트 슬롯', 'netent', 'lobby'],
  ['레드타이거 슬롯', 'redtiger', 'lobby'],
  ['빅타임 게이밍 슬롯', 'btg', 'lobby'],
  ['노리밋 시티 슬롯', 'nlc', 'lobby'],
  ['탭어루 슬롯', 'taparoo', 'lobby'],
  ['프라그마틱 카지노', 'pragmatic_casino', 'lobby'],
  ['프라그마틱 슬롯', 'pragmatic_slot', 'lobby'],
  ['CQ9 카지노', 'cq9_casino', 'lobby'],
  ['CQ9 슬롯', 'cq9', 'lobby'],
  ['섹시 카지노', 'SEXYBCRT', 'lobby'],
  ['보타 카지노', 'VOTA', 'lobby'],
  ['두윈 카지노', 'dowin', 'lobby'],
  ['플레이앤고 슬롯', 'PLAYNGO', 'lobby'],
  ['비보 카지노', 'TOMHORN_VIVO', 'lobby'],
  ['탐혼 슬롯', 'TOMHORN_SLOT', 'lobby'],
  ['탐혼 7모조 카지노', 'TOMHORN_7Mojos', 'lobby'],
  ['탐혼 앱솔루트라이브', 'TOMHORN_AbsoluteLive', 'lobby'],
  ['부운고 슬롯', 'booongo', 'lobby'],
  ['플레이손 슬롯', 'playson', 'lobby'],
  ['하바네로 슬롯', 'habanero', 'lobby'],
  ['1x2 슬롯', '1x2', 'lobby'],
  ['벨라트라 슬롯', 'belatra', 'lobby'],
  ['BF게임즈 슬롯', 'bfgames', 'lobby'],
  ['컨셉게이밍 슬롯', 'conceptgaming', 'lobby'],
  ['이쥐피 슬롯', 'egp', 'lobby'],
  ['게임아트 슬롯', 'gameart', 'lobby'],
  ['겜피쉬글로벌 슬롯', 'gamefishglobal', 'lobby'],
  ['쥐엠더블유 슬롯', 'gmw', 'lobby'],
  ['카게이밍 슬롯', 'kagaming', 'lobby'],
  ['립 슬롯', 'leap', 'lobby'],
  ['레가플레이 슬롯', 'legaplay', 'lobby'],
  ['마코우 슬롯', 'macaw', 'lobby'],
  ['엠플레이 슬롯', 'mplay', 'lobby'],
  ['엔조이게이밍 슬롯', 'Njoy Gaming', 'lobby'],
  ['원터치', 'onetouch', 'lobby'],
  ['파타고니아 슬롯', 'patagonia', 'lobby'],
  ['플레이펄 슬롯', 'playpearls', 'lobby'],
  ['레드케이크 슬롯', 'redrake', 'lobby'],
  ['비브라게이밍 슬롯', 'vibragaming', 'lobby'],
  ['와즈단', 'wazdan', 'lobby'],
  ['위아카지노 슬롯', 'wearecasino', 'lobby'],
  ['아시아 게이밍 AGIN', 'AGIN', 'lobby'],
  ['타이산 카지노', 'taishan', 'lobby'],
  ['마이크로 카지노', 'MICRO_Casino', 'lobby'],
  ['마이크로 슬롯', 'MICRO_Slot', 'lobby'],
  ['드림게임 카지노', 'dream', 'lobby'],
  [
    '홀덤 초보',
    'wildgame',
    'Wild_WebHoldem_Masters1',
  ],
  ['홀덤 고수', 'wildgame', 'Wild_WebHoldem_Masters2'],
  ['PG 소프트', 'pgsoft', 'lobby'],
  ['Sa 카지노', 'sa', 'lobby'],
  ['비티원 스포츠', 'bt1', 'lobby'],
  ['오리엔탈 카지노', 'oriental', 'lobby'],
  ['컬러 게임', 'color', 'lobby'],
  ['질리 슬롯', 'jili', 'lobby'],
  ['질리 아케이드', 'jili_arcade', 'lobby'],
  ['JDB 슬롯', 'jdb', 'lobby'],
  ['JDB 아케이드', 'jdb_arcade', 'lobby'],
  ['FC 슬롯', 'fc_slot', 'lobby'],
  ['FC 아케이드', 'fc_arcade', 'lobby'],
  ['핵소 슬롯', 'hacksaw_slot', 'lobby'],
  ['핵소 아케이드', 'hacksaw_arcade', 'lobby'],
  ['ZN 슬롯', 'zn_slot', 'lobby'],
  ['GTF', 'gtf', 'lobby'],
  ['스페이드게이밍', 'spade', 'lobby'],
  ['옐로우배트', 'yellowbat', 'lobby'],
  ['어드밴트플레이', 'advantplay', 'lobby'],
  ['이보플레이', 'evoplay', 'lobby'],
  ['아스크미슬롯', 'askmeslot', 'lobby'],
  ['비게이밍', 'bgaming', 'lobby'],
  ['세븐모조', 'gpk7mj', 'lobby'],
  ['부밍', 'booming', 'lobby'],
  ['스피노메날', 'spinomenal', 'lobby'],
  ['라이브22', 'live22', 'lobby'],
  ['크리에이티브', 'cg', 'lobby'],
  ['디비', 'dbgame', 'lobby'],
  ['썬더킥', 'thunderkick', 'lobby'],
  ['올벳', 'allbet', 'lobby'],
  ['에주기', 'ezugi', 'lobby'],
  ['아이디엔', 'idnlive', 'lobby'],
  ['아이코닉21', 'iconic21', 'lobby'],
  ['플레이텍 카지노', 'playtech', 'lobby'],
  ['프리티 게이밍', 'pretty', 'lobby'],
  ['윈피니티', 'winfinity', 'lobby'],
  ['WM 카지노', 'wm', 'lobby'],
  ['5GG 슬롯', '5GG', 'lobby'],
  ['아미고 게이밍', 'amigo', 'lobby'],
  ['아스펙트', 'aspect', 'lobby'],
  ['빅 팟', 'bigpot', 'lobby'],
  ['갬빗 스튜디오', 'gambitstudio', 'lobby'],
  ['킹메이커', 'kingmaker', 'lobby'],
  ['옥토플레이', 'octoplay', 'lobby'],
  ['신', 'xin', 'lobby'],
  ['릴랙스 게이밍', 'relaxgaming', 'lobby'],
  ['슬롯밀', 'slotmil', 'lobby'],
  ['윈스피니티', 'winspinity', 'lobby'],
  ['이월드매치', 'eworldmatch', 'lobby'],
  ['이그드라실', 'yggdrasil', 'lobby'],
  ['윈스피니티(중복명)', 'winsfinity', 'lobby'],
  ['플레이텍 슬롯', 'playtech_slot', 'lobby'],
  ['윈패스트 슬롯', 'winfast', 'lobby'],
  ['게임테크 슬롯', 'gametech', 'lobby'],
];

async function main() {
  loadDotEnv();
  const key = process.env.VINUS_AGENT_KEY?.trim();
  const base =
    process.env.VINUS_GAME_BASE_URL?.trim() || 'https://game.vinus-gaming.com';
  if (!key) {
    console.error('VINUS_AGENT_KEY 가 비어 있습니다.');
    process.exit(1);
  }

  const okList = [];
  const failList = [];

  for (const [label, vendor, game] of ROWS) {
    const url = new URL('/game/play-game', base.replace(/\/$/, ''));
    url.searchParams.set('key', key);
    url.searchParams.set('token', makeToken());
    url.searchParams.set('game', game);
    url.searchParams.set('vendor', vendor);
    url.searchParams.set('platform', 'WEB');
    url.searchParams.set('method', 'seamless');
    url.searchParams.set('lang', 'ko');

    let line = `${vendor}\t${game}\t`;
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        failList.push({ label, vendor, game, err: 'non-json', snippet: text.slice(0, 120) });
        line += `FAIL\tnon-json`;
        console.log(line);
        await new Promise((r) => setTimeout(r, 80));
        continue;
      }
      const good =
        json.result === 0 &&
        typeof json.url === 'string' &&
        isProbablyGameUrl(json.url);
      if (good) {
        okList.push({ label, vendor, game, url: json.url });
        line += `OK\turl ok`;
      } else {
        const msg = json.message || `result=${json.result}`;
        failList.push({ label, vendor, game, err: String(msg) });
        line += `FAIL\t${String(msg).slice(0, 80)}`;
      }
    } catch (e) {
      failList.push({ label, vendor, game, err: e.message });
      line += `FAIL\t${e.message}`;
    }
    console.log(line);
    await new Promise((r) => setTimeout(r, 80));
  }

  console.log('\n--- 요약 ---');
  console.log(`성공: ${okList.length} / 전체 ${ROWS.length}`);
  console.log('\n[성공 벤더 — 프론트 카드 후보]');
  for (const o of okList) {
    console.log(`- ${o.label} | vendor=${o.vendor} | game=${o.game}`);
  }
  console.log('\n[실패 수: ' + failList.length + '] (상세는 위 FAIL 로그 참고)');

  const outPath = resolve(__dirname, '../tmp/vinus-vendor-matrix-last.json');
  try {
    const { mkdirSync, writeFileSync } = require('fs');
    mkdirSync(resolve(__dirname, '../tmp'), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify({ at: new Date().toISOString(), ok: okList, fail: failList }, null, 2),
      'utf8',
    );
    console.log('\nJSON 저장:', outPath);
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

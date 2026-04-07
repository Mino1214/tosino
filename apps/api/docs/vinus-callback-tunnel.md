# Vinus 콜백 URL을 임시 공개하기 (cloudflared)

벤더 **API 연동 테스트** 페이지는 인터넷에서 우리 서버로 `POST` 해야 하므로, 로컬 개발 시 **터널**로 HTTPS URL을 만들면 됩니다.

## 1. 사전 준비

1. 로컬에서 API 실행: `pnpm run start:dev` (기본 `http://127.0.0.1:4001`)
2. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) 설치  
   - macOS: `brew install cloudflared`
3. `.env` 에 `VINUS_AGENT_KEY` 설정 (콜백 URL은 헤더 `authKey` 검증 없음)

## 2. Quick Tunnel (가장 빠름, 도메인 매번 변경)

한 터미널에서:

```bash
cd apps/api
./scripts/cloudflared-api-tunnel.sh
```

또는 직접:

```bash
cloudflared tunnel --url http://127.0.0.1:4001
```

출력에 나오는 `https://....trycloudflare.com` 가 **공개 베이스 URL**입니다.

**벤더에 등록할 콜백 URL (path 고정):**

```text
https://<터널호스트>/webhooks/vinus
```

예: `https://abc-xyz.trycloudflare.com/webhooks/vinus`

- Quick Tunnel은 **프로세스를 끄면 URL이 무효**되고, 다시 켜면 주소가 바뀔 수 있습니다.
- 테스트 끝나면 벤더 측 콜백 URL을 **운영 서버 주소**로 바꿉니다.

## 3. 벤더 테스트 페이지에서

1. API 문서대로 **토큰 생성** 후, 해당 회원의 DB/세션에 토큰 저장 (또는 솔루션에서 입장으로 발급된 토큰 사용).
2. **키 값** = `VINUS_AGENT_KEY` (5자 등 계약 키).
3. **토큰** = 위에서 저장한 값.
4. 각 단계(회원 인증, 잔액, 베팅, 재전송 멱등 등) 실행.

우리 구현은 **같은 `transaction_id` 재요청** 시 API 문서대로 **이미 처리한 성공 응답**을 다시 돌려줍니다. 성공 응답에는 `result`, `status`, `data` 형태를 맞춥니다.

## 4. 응답 형식 (벤더 안내와 맞춤)

- 성공: `result: 0`, `status: "OK"`, `data: { ... }`
- 실패: `result: <코드>`, `status: "ERROR"`, 필요 시 `data.balance`
- **cancel** 성공 시 `data` 에 `user_id`, `transaction_id`, 벤더 문서 오타 호환용 `trasaction_id` 포함

## 5. 트러블슈팅

| 현상 | 확인 |
|------|------|
| 502 / 연결 실패 | API가 떠 있는지, 터널 `--url` 포트가 `API_PORT` 와 같은지 |
| 503 Vinus 미설정 | `.env`에 `VINUS_AGENT_KEY` 설정 |
| CORS | 콜백은 **서버→서버**라 브라우저 CORS와 무관. 벤더가 브라우저에서 치면 다른 문제 |

## 6. 테스트 서버 / 실서버

이 문서는 **개발 PC + 터널** 용입니다. 절차는:

1. 여기서 로직·응답 형식 맞춤 → `pnpm run vinus:flows-smoke` 등
2. 스테이징(테스트 서버)에 동일 코드 배포 후, **고정 도메인**으로 콜백 등록해 벤더 재검증
3. 실서버 URL로 최종 변경

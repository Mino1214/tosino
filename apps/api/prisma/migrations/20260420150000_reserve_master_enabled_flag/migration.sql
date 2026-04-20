-- Reserve Balance: 마스터 스위치(reserveEnabled) 추가
-- true 로 두면 실시간(Vinus 카지노 콜백) · 배치 정산 모두에서 알(creditBalance) 차감·복구가 동작.
-- false 로 바꾸면 test-scenario · 관리자 수동 API 외에는 전부 무시되어 기존 배팅 로직 영향 없음.

ALTER TABLE "Platform"
  ADD COLUMN IF NOT EXISTS "reserveEnabled" BOOLEAN NOT NULL DEFAULT true;

-- 배포 전까지 "가상 잔액 시스템을 끄고 관찰만" 하고 싶은 플랫폼이 있다면
-- UPDATE "Platform" SET "reserveEnabled" = false WHERE ... 로 명시적으로 off 할 수 있다.

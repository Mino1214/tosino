"use client";

import { useRef, useState } from "react";
import { fetchReferral, publicRegister } from "@/lib/api";

const BANKS = [
  { value: "43", label: "카카오뱅크" },
  { value: "3", label: "기업은행" },
  { value: "4", label: "국민은행" },
  { value: "6", label: "수협은행" },
  { value: "8", label: "농협은행" },
  { value: "10", label: "우리은행" },
  { value: "11", label: "SC제일은행" },
  { value: "13", label: "한국씨티은행" },
  { value: "14", label: "대구은행" },
  { value: "15", label: "부산은행" },
  { value: "16", label: "광주은행" },
  { value: "17", label: "제주은행" },
  { value: "18", label: "전북은행" },
  { value: "19", label: "경남은행" },
  { value: "20", label: "새마을금고연합회" },
  { value: "21", label: "신협중앙회" },
  { value: "37", label: "우체국" },
  { value: "40", label: "하나은행" },
  { value: "41", label: "신한은행" },
];

const TELECOM = [
  { value: "SKT", label: "SKT" },
  { value: "KT", label: "KT" },
  { value: "LG_U_PLUS", label: "LGU+" },
  { value: "SKT_MVNO", label: "SKT 알뜰폰" },
  { value: "KT_MVNO", label: "KT 알뜰폰" },
  { value: "LG_U_PLUS_MVNO", label: "LGU 알뜰폰" },
];

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-[rgba(218,174,87,0.6)] focus:bg-white/8 transition-colors";
const selectCls =
  "rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-3 text-sm text-zinc-100 outline-none focus:border-[rgba(218,174,87,0.6)] transition-colors";
const labelCls = "block text-xs font-medium text-zinc-400 mb-1.5";
const errCls = "mt-1 text-[11px] text-red-400";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}
        {required && (
          <span className="ml-0.5 text-main-gold">*</span>
        )}
      </label>
      {children}
      {error && <p className={errCls}>{error}</p>}
    </div>
  );
}

function PinInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const cellRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !e.currentTarget.value && i > 0) {
      cellRefs.current[i - 1]?.focus();
      const arr = value.split("");
      arr[i - 1] = "";
      onChange(arr.join(""));
    }
  }
  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const ch = e.target.value.replace(/\D/, "").slice(-1);
    const arr = value.padEnd(6, " ").split("");
    arr[i] = ch;
    const next = arr.join("").trimEnd();
    onChange(next);
    if (ch && i < 5) cellRefs.current[i + 1]?.focus();
  }

  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            cellRefs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="h-11 w-full rounded-lg border border-white/10 bg-white/5 text-center text-lg text-zinc-100 outline-none focus:border-[rgba(218,174,87,0.6)] transition-colors"
          aria-label={`PIN ${i + 1}번째 자리`}
        />
      ))}
    </div>
  );
}

export type SignupFormProps = {
  /** 가입 완료 후 (성공 메시지 표시 뒤) 호출 — 모달에서 로그인 열기 등 */
  onRegistered?: () => void;
  onRequestLogin?: () => void;
};

export function SignupForm({ onRegistered, onRequestLogin }: SignupFormProps) {
  const host = typeof window !== "undefined" ? window.location.host : "";

  type Mode = "full" | "anonymous";
  const [mode, setMode] = useState<Mode>("full");
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [refOk, setRefOk] = useState<{
    platformName: string;
    agentDisplayName: string;
  } | null>(null);

  const [loginId, setLoginId] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [telegram, setTelegram] = useState("");
  const [pin, setPin] = useState("");
  const [exchangePwd, setExchangePwd] = useState("");

  const [bank, setBank] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [holder, setHolder] = useState("");
  const [telecom, setTelecom] = useState("SKT");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [birth, setBirth] = useState("");
  const [gender, setGender] = useState("M");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await fetchReferral(code || "ZXX", host);
      setRefOk({
        platformName: data.platformName,
        agentDisplayName: data.agentDisplayName,
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "코드 확인 실패");
    } finally {
      setLoading(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!loginId.trim()) errs.loginId = "아이디를 입력하세요";
    else if (!/^[a-z0-9._@-]{3,64}$/.test(loginId.trim()))
      errs.loginId = "3~64자, 소문자·숫자·._@-만 가능";
    if (!password) errs.password = "비밀번호를 입력하세요";
    else if (password.length < 6) errs.password = "6자 이상 입력하세요";
    if (password !== confirm) errs.confirm = "비밀번호가 일치하지 않습니다";
    if (!telegram.trim()) errs.telegram = "텔레그램 아이디는 필수입니다";

    if (mode === "anonymous") {
      if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        errs.pin = "4~6자리 숫자 PIN을 입력하세요";
      }
    }
    if (mode === "full") {
      if (!bank) errs.bank = "은행을 선택하세요";
      if (!accountNo.trim()) errs.accountNo = "계좌번호를 입력하세요";
      if (!holder.trim()) errs.holder = "예금주를 입력하세요";
      if (exchangePwd.length < 4)
        errs.exchangePwd = "환전 비밀번호를 4자 이상 입력하세요";
      if (!phone1.trim() || !phone2.trim()) errs.phone = "전화번호를 입력하세요";
      if (birth.length !== 8)
        errs.birth = "생년월일 8자리를 입력하세요 (YYYYMMDD)";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await publicRegister(
        {
          loginId: loginId.trim().toLowerCase(),
          password,
          referralCode: code || "ZXX",
          displayName: nickname.trim() || undefined,
          signupMode: mode,
          telegramUsername: telegram.trim() || undefined,
          exchangePin:
            mode === "anonymous" ? pin || undefined : exchangePwd || undefined,
          ...(mode === "full"
            ? {
                bankCode: bank,
                bankAccountNumber: accountNo.trim(),
                bankAccountHolder: holder.trim(),
                telecomCompany: telecom,
                phone: `010${phone1.trim()}${phone2.trim()}`,
                birthDate: birth.trim(),
                gender,
              }
            : {}),
        },
        host,
      );
      setSuccess(res.message);
      window.setTimeout(() => {
        onRegistered?.();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가입 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">회원가입</h1>
        {onRequestLogin ? (
          <button
            type="button"
            onClick={onRequestLogin}
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            로그인으로 →
          </button>
        ) : null}
      </div>

      <div className="mb-5 flex rounded-xl border border-white/8 bg-white/3 p-1">
        {(["full", "anonymous"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setFieldErrors({});
              setError(null);
              setPin("");
              setExchangePwd("");
            }}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
              mode === m
                ? "bg-gold-gradient text-black"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {m === "full" ? "일반 회원가입" : "무기명 회원가입"}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            step === 1
              ? "bg-gold-gradient text-black"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          ① 가입코드
        </span>
        <span className="text-zinc-700">──</span>
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            step === 2
              ? "bg-gold-gradient text-black"
              : "bg-zinc-800 text-zinc-500"
          }`}
        >
          ② 회원 정보
        </span>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-700/40 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-700/40 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="flex gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-zinc-400">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
            </svg>
            <p>
              가입코드가 없으시다면{" "}
              <span className="font-bold text-main-gold">
                ZXX
              </span>
              를 입력해 주세요
            </p>
          </div>

          <Field label="가입코드">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="코드를 입력하세요"
              autoComplete="off"
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-gold-gradient py-3.5 text-sm font-bold transition-opacity disabled:opacity-40"
          >
            {loading ? "확인 중…" : "코드 확인"}
          </button>
        </form>
      )}

      {step === 2 && refOk && (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm">
            <span className="text-zinc-500">
              <span className="text-zinc-300">{refOk.platformName}</span> ·
              총판:{" "}
              <span className="text-zinc-300">{refOk.agentDisplayName}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setRefOk(null);
              }}
              className="text-xs text-main-gold hover:opacity-70"
            >
              변경
            </button>
          </div>

          <Field label="사용자명 (아이디)" required error={fieldErrors.loginId}>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              autoComplete="username"
              className={inputCls}
            />
          </Field>

          <Field label="닉네임">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              autoComplete="off"
              className={inputCls}
            />
          </Field>

          <Field label="비밀번호" required error={fieldErrors.password}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>

          <Field label="비밀번호 확인" required error={fieldErrors.confirm}>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="비밀번호를 확인해 주세요"
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>

          {mode === "full" && (
            <>
              <Field
                label="은행 (카카오뱅크 충전 시 +1만)"
                error={fieldErrors.bank ?? fieldErrors.accountNo}
              >
                <div className="flex gap-2">
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className={`${selectCls} w-36 shrink-0`}
                  >
                    <option value="" disabled>
                      은행 선택
                    </option>
                    {BANKS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <input
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    placeholder="계좌번호"
                    autoComplete="off"
                    className={`${inputCls} flex-1`}
                  />
                </div>
              </Field>

              <Field label="예금주" required error={fieldErrors.holder}>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  placeholder="예금주 이름을 입력해 주세요"
                  autoComplete="off"
                  className={inputCls}
                />
              </Field>

              <Field
                label="환전비밀번호"
                required
                error={fieldErrors.exchangePwd}
              >
                <input
                  type="password"
                  value={exchangePwd}
                  onChange={(e) => setExchangePwd(e.target.value)}
                  placeholder="환전 비밀번호를 입력하세요"
                  autoComplete="off"
                  className={inputCls}
                />
              </Field>
            </>
          )}

          <Field label="텔레그램 아이디" required error={fieldErrors.telegram}>
            <input
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@ 기호 없이 입력 (예: username)"
              autoComplete="off"
              className={inputCls}
            />
          </Field>

          {mode === "full" && (
            <>
              <Field label="통신사">
                <select
                  value={telecom}
                  onChange={(e) => setTelecom(e.target.value)}
                  className={`${selectCls} w-full`}
                >
                  {TELECOM.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="전화번호" required error={fieldErrors.phone}>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value="010"
                    className="w-14 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-zinc-400"
                  />
                  <span className="text-zinc-600">-</span>
                  <input
                    type="number"
                    value={phone1}
                    onChange={(e) =>
                      setPhone1(e.target.value.slice(0, 4))
                    }
                    placeholder="0000"
                    className={`${inputCls} flex-1 text-center`}
                  />
                  <span className="text-zinc-600">-</span>
                  <input
                    type="number"
                    value={phone2}
                    onChange={(e) =>
                      setPhone2(e.target.value.slice(0, 4))
                    }
                    placeholder="0000"
                    className={`${inputCls} flex-1 text-center`}
                  />
                </div>
              </Field>

              <Field label="생년월일" required error={fieldErrors.birth}>
                <input
                  value={birth}
                  onChange={(e) =>
                    setBirth(e.target.value.replace(/\D/, "").slice(0, 8))
                  }
                  placeholder="생년월일을 입력하세요 (YYYYMMDD) 19930505"
                  autoComplete="bday"
                  className={inputCls}
                />
              </Field>

              <Field label="성별">
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={`${selectCls} w-full`}
                >
                  <option value="M">남성</option>
                  <option value="F">여성</option>
                </select>
              </Field>
            </>
          )}

          {mode === "anonymous" && (
            <Field
              label="입출금 2차 비밀번호 (숫자 4~6자리)"
              required
              error={fieldErrors.pin}
            >
              <PinInput value={pin} onChange={setPin} />
              <p className="mt-1.5 text-[11px] text-zinc-600">
                ※ 입출금 시 사용할 2차 비밀번호 (숫자 4~6자리)
              </p>
            </Field>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-gold-gradient py-3.5 text-sm font-bold transition-opacity disabled:opacity-40"
          >
            {loading ? "처리 중…" : "회원가입"}
          </button>

          <p className="text-center text-xs text-zinc-600">
            {mode === "full"
              ? "일반 가입은 관리자 승인 후 로그인할 수 있습니다."
              : "무기명 가입은 승인 없이 바로 로그인할 수 있습니다."}
          </p>
        </form>
      )}
    </div>
  );
}

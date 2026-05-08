export interface CredentialResult {
  ok: boolean;
  error?: string;
  username?: string;
  password?: string;
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;

export function validateCredentials(input: unknown): CredentialResult {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "잘못된 요청입니다." };
  }
  const { username, password } = input as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    return { ok: false, error: "아이디와 비밀번호를 입력해 주세요." };
  }
  const trimmedUsername = username.trim();
  if (!USERNAME_RE.test(trimmedUsername)) {
    return {
      ok: false,
      error:
        "아이디는 영문/숫자/_-. 조합 3~20자만 사용할 수 있습니다 (이메일 형식 불가).",
    };
  }
  if (trimmedUsername.includes("@")) {
    return { ok: false, error: "이메일 형식의 아이디는 사용할 수 없습니다." };
  }
  if (password.length < 6 || password.length > 64) {
    return { ok: false, error: "비밀번호는 6~64자여야 합니다." };
  }
  return { ok: true, username: trimmedUsername, password };
}

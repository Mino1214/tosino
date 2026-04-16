/** 관리자 UI용 계정 역할 표시 */
export function userRoleLabelKo(role: string | undefined | null): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "본사 총괄";
    case "PLATFORM_ADMIN":
      return "플랫폼 관리자";
    case "MASTER_AGENT":
      return "총판";
    case "USER":
      return "일반 유저";
    default:
      return role?.trim() ? role : "—";
  }
}

/** 회원가입 승인 상태 */
export function registrationStatusLabelKo(
  s: string | undefined | null,
): string {
  switch (s) {
    case "PENDING":
      return "승인 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "거절됨";
    default:
      return s?.trim() ? s : "—";
  }
}

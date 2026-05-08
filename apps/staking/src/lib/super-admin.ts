import type { SessionPayload } from "@/lib/session";

export const SUPER_ADMIN_USERNAME = "admin";
export const DEFAULT_SUPER_ADMIN_PASSWORD = "12345^^";

export function getSuperAdminPassword() {
  return process.env.SUPER_ADMIN_PASSWORD ?? DEFAULT_SUPER_ADMIN_PASSWORD;
}

export function isSuperAdminSession(session: SessionPayload | null) {
  return session?.username === SUPER_ADMIN_USERNAME;
}

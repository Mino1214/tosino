import { UserRole } from '@prisma/client';

export type MasterCommissionNode = {
  id: string;
  parentUserId: string | null;
  agentPlatformSharePct: number | null;
  agentSplitFromParentPct: number | null;
};

/**
 * 실효 요율 계산.
 * - 직속 부모가 총판이 아니어도(플랫폼 어드민 등), `resolveParentUserId`로 올라가며
 *   **목록(masters)에 포함된 가장 가까운 상위 총판**을 찾으면: 실효 = 그 총판 실효 × (agentSplitFromParentPct/100).
 * - 상위 총판을 찾지 못하면 agentPlatformSharePct(최상위 총판 요율).
 * - `resolveParentUserId`를 생략하면 기존처럼 **직속 부모만** 총판 여부를 본다.
 */
export function computeEffectiveAgentShares(
  masters: MasterCommissionNode[],
  roleById: Map<string, UserRole>,
  resolveParentUserId?: (userId: string) => string | null,
): Map<string, number> {
  const byId = new Map(masters.map((m) => [m.id, m]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

  const nearestMasterAgentInTree = (startParentId: string | null): string | null => {
    if (!startParentId) return null;
    let cur: string | null = startParentId;
    const seen = new Set<string>();
    while (cur) {
      if (seen.has(cur)) return null;
      seen.add(cur);
      if (
        byId.has(cur) &&
        roleById.get(cur) === UserRole.MASTER_AGENT
      ) {
        return cur;
      }
      cur = resolveParentUserId ? resolveParentUserId(cur) ?? null : null;
    }
    return null;
  };

  const dfs = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const u = byId.get(id);
    if (!u) {
      visiting.delete(id);
      return 0;
    }
    const pId = u.parentUserId;
    const commissionParentId = resolveParentUserId
      ? nearestMasterAgentInTree(pId)
      : pId != null && roleById.get(pId) === UserRole.MASTER_AGENT
        ? pId
        : null;
    let eff: number;
    if (commissionParentId == null) {
      eff = u.agentPlatformSharePct ?? 0;
    } else {
      eff = (dfs(commissionParentId) * (u.agentSplitFromParentPct ?? 0)) / 100;
    }
    memo.set(id, eff);
    visiting.delete(id);
    return eff;
  };

  for (const m of masters) dfs(m.id);
  return memo;
}

import { UserRole } from '@prisma/client';

export type MasterCommissionNode = {
  id: string;
  parentUserId: string | null;
  agentPlatformSharePct: number | null;
  agentSplitFromParentPct: number | null;
};

/** 상위가 총판이면: 실효 = 상위실효 × (agentSplitFromParentPct/100). 아니면 agentPlatformSharePct. */
export function computeEffectiveAgentShares(
  masters: MasterCommissionNode[],
  roleById: Map<string, UserRole>,
): Map<string, number> {
  const byId = new Map(masters.map((m) => [m.id, m]));
  const memo = new Map<string, number>();
  const visiting = new Set<string>();

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
    const parentIsMa =
      pId != null && roleById.get(pId) === UserRole.MASTER_AGENT;
    let eff: number;
    if (!parentIsMa) {
      eff = u.agentPlatformSharePct ?? 0;
    } else {
      eff = (dfs(pId) * (u.agentSplitFromParentPct ?? 0)) / 100;
    }
    memo.set(id, eff);
    visiting.delete(id);
    return eff;
  };

  for (const m of masters) dfs(m.id);
  return memo;
}

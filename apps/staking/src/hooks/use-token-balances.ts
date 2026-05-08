"use client";

import { useAccount, useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { ERC20_ABI, TRACKED_TOKENS } from "@/lib/erc20";

export interface TokenBalance {
  symbol: string;
  name: string;
  color: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  network?: string;
  chainId?: number;
}

export function useTokenBalances(addressOverride?: Address | null) {
  const { address: connectedAddress } = useAccount();
  const address = addressOverride ?? connectedAddress;

  const result = useReadContracts({
    contracts: address
      ? TRACKED_TOKENS.map((t) => ({
          address: t.address,
          abi: ERC20_ABI,
          functionName: "balanceOf" as const,
          args: [address],
          chainId: t.chainId,
        }))
      : [],
    query: { enabled: !!address, staleTime: 30_000 },
  });

  const balances: TokenBalance[] = TRACKED_TOKENS.map((t, i) => {
    const item = result.data?.[i];
    const raw =
      item && item.status === "success" && typeof item.result === "bigint"
        ? item.result
        : BigInt(0);
    const balance = Number(formatUnits(raw, t.decimals));
    return {
      symbol: t.symbol,
      name: t.name,
      color: t.color,
      balance,
      priceUsd: t.priceUsd,
      valueUsd: balance * t.priceUsd,
      network: t.network,
      chainId: t.chainId,
    };
  });

  return {
    balances,
    isLoading: result.isLoading,
    refetch: result.refetch,
  };
}

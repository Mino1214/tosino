import type { Address } from "viem";
import { LST_PRODUCTS } from "@/lib/staking-assets";

export const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export interface TokenMeta {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  chainId: number;
  network: string;
  color: string;
  priceUsd: number;
}

// EVM token contracts are derived from the staking catalog so the UI,
// balance detection, and approve flow all share one network map.
export const TRACKED_TOKENS: TokenMeta[] = LST_PRODUCTS.flatMap((product) => {
  if (
    product.approval?.mode !== "erc20" ||
    product.approval.chain !== "eip155" ||
    !product.approval.chainId ||
    !product.approval.tokenAddress
  ) {
    return [];
  }

  return [
    {
      symbol: product.sourceSymbol,
      name: product.sourceName,
      address: product.approval.tokenAddress as Address,
      decimals: product.approval.decimals,
      chainId: product.approval.chainId,
      network: product.network,
      color: product.color,
      priceUsd: product.priceUsd ?? 0,
    },
  ];
});

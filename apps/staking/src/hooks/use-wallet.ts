"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useDisconnect,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits, type Address } from "viem";
import { mainnet } from "wagmi/chains";

export interface WalletState {
  address: Address | null;
  chainId: number | null;
  ethBalance: number | null;
  isConnecting: boolean;
  hasProvider: boolean;
  error: string | null;
  connectorId: string | null;
  connectorName: string | null;
}

export function useWallet(opts?: {
  onConnect?: (address: Address) => void;
  onDisconnect?: () => void;
}) {
  const { open } = useAppKit();
  const { address, isConnected, isConnecting, isReconnecting, connector } =
    useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const balanceQuery = useBalance({
    address,
    chainId: mainnet.id,
    query: { enabled: !!address, staleTime: 30_000 },
  });

  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  const lastNotifiedAddress = useRef<string | null>(null);
  useEffect(() => {
    if (isConnected && address) {
      if (lastNotifiedAddress.current !== address) {
        lastNotifiedAddress.current = address;
        optsRef.current?.onConnect?.(address);
      }
    } else {
      if (lastNotifiedAddress.current !== null) {
        lastNotifiedAddress.current = null;
        optsRef.current?.onDisconnect?.();
      }
    }
  }, [isConnected, address]);

  const connect = useCallback(async () => {
    // Always open the wallet selection (connect) view so the user can switch wallets.
    // This avoids auto-jumping into the last-used wallet (e.g. SafePal) when already connected.
    await open({ view: "Connect", namespace: "eip155" });
  }, [open]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  const refresh = useCallback(async () => {
    await balanceQuery.refetch();
  }, [balanceQuery]);

  const ethBalance = balanceQuery.data
    ? Number(formatUnits(balanceQuery.data.value, balanceQuery.data.decimals))
    : null;

  const state: WalletState = {
    address: address ?? null,
    chainId: chainId ?? null,
    ethBalance,
    isConnecting: isConnecting || isReconnecting,
    hasProvider: true,
    error: null,
    connectorId: connector?.id ?? null,
    connectorName: connector?.name ?? null,
  };

  return { ...state, connect, disconnect, refresh };
}

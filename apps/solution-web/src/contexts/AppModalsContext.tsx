"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type WalletModalOptions = {
  mainTab?: "fiat" | "usdt";
  fiatTab?: "DEPOSIT" | "WITHDRAWAL";
};

type AppModalsContextValue = {
  signupOpen: boolean;
  loginOpen: boolean;
  walletOpen: boolean;
  walletOptions: WalletModalOptions;
  walletOpenVersion: number;
  openSignup: () => void;
  openLogin: () => void;
  openWallet: (opts?: WalletModalOptions) => void;
  closeSignup: () => void;
  closeLogin: () => void;
  closeWallet: () => void;
};

const AppModalsContext = createContext<AppModalsContextValue | null>(null);

export function AppModalsProvider({ children }: { children: React.ReactNode }) {
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletOptions, setWalletOptions] = useState<WalletModalOptions>({});
  const [walletOpenVersion, setWalletOpenVersion] = useState(0);

  const closeSignup = useCallback(() => setSignupOpen(false), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);
  const closeWallet = useCallback(() => setWalletOpen(false), []);

  const openSignup = useCallback(() => {
    setLoginOpen(false);
    setWalletOpen(false);
    setSignupOpen(true);
  }, []);

  const openLogin = useCallback(() => {
    setSignupOpen(false);
    setWalletOpen(false);
    setLoginOpen(true);
  }, []);

  const openWallet = useCallback((opts?: WalletModalOptions) => {
    setSignupOpen(false);
    setLoginOpen(false);
    setWalletOptions(opts ?? {});
    setWalletOpenVersion((v) => v + 1);
    setWalletOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      signupOpen,
      loginOpen,
      walletOpen,
      walletOptions,
      walletOpenVersion,
      openSignup,
      openLogin,
      openWallet,
      closeSignup,
      closeLogin,
      closeWallet,
    }),
    [
      signupOpen,
      loginOpen,
      walletOpen,
      walletOptions,
      walletOpenVersion,
      openSignup,
      openLogin,
      openWallet,
      closeSignup,
      closeLogin,
      closeWallet,
    ],
  );

  return (
    <AppModalsContext.Provider value={value}>{children}</AppModalsContext.Provider>
  );
}

export function useAppModals() {
  const ctx = useContext(AppModalsContext);
  if (!ctx) {
    throw new Error("useAppModals must be used within AppModalsProvider");
  }
  return ctx;
}

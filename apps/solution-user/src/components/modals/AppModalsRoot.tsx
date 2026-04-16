"use client";

import { useRouter } from "next/navigation";
import { useAppModals } from "@/contexts/AppModalsContext";
import { ModalScaffold } from "./ModalScaffold";
import { SignupForm } from "@/components/signup/SignupForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { WalletPanel } from "@/components/wallet/WalletPanel";

export function AppModalsRoot() {
  const router = useRouter();
  const {
    signupOpen,
    loginOpen,
    walletOpen,
    walletOptions,
    walletOpenVersion,
    closeSignup,
    closeLogin,
    closeWallet,
    openLogin,
    openSignup,
  } = useAppModals();

  return (
    <>
      <ModalScaffold
        open={signupOpen}
        onClose={closeSignup}
        title="회원가입"
        wide
      >
        <SignupForm
          onRequestLogin={() => {
            closeSignup();
            openLogin();
          }}
          onRegistered={() => {
            closeSignup();
            openLogin();
          }}
        />
      </ModalScaffold>

      <ModalScaffold open={loginOpen} onClose={closeLogin} title="로그인">
        <LoginForm
          compact
          onSuccess={() => {
            closeLogin();
            router.refresh();
          }}
          onRequestSignup={() => {
            closeLogin();
            openSignup();
          }}
        />
      </ModalScaffold>

      <ModalScaffold
        open={walletOpen}
        onClose={closeWallet}
        title="입금 · 출금"
        wide
      >
        <WalletPanel
          key={walletOpenVersion}
          variant="modal"
          initialOpts={walletOptions}
          onNeedLogin={() => {
            closeWallet();
            openLogin();
          }}
        />
      </ModalScaffold>
    </>
  );
}

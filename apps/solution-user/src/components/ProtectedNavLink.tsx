"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useAppModals } from "@/contexts/AppModalsContext";
import { getAccessToken } from "@/lib/api";

type ProtectedNavLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> &
  LinkProps & {
    children: ReactNode;
    requireAuth?: boolean;
    onBlocked?: () => void;
    onNavigate?: () => void;
  };

export function ProtectedNavLink({
  children,
  requireAuth = true,
  onBlocked,
  onNavigate,
  onClick,
  ...props
}: ProtectedNavLinkProps) {
  const { openLogin } = useAppModals();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    if (requireAuth && !getAccessToken()) {
      event.preventDefault();
      onBlocked?.();
      openLogin();
      return;
    }

    onNavigate?.();
  }

  return (
    <Link {...props} onClick={handleClick}>
      {children}
    </Link>
  );
}

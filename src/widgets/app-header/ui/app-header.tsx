"use client";

import Link from "next/link";

import { routes } from "@/config/constants";
import { SignOutButton } from "@/features/auth-by-email/ui/sign-out-button";
import { authClient } from "@/shared/api/auth/auth-client";

export function AppHeader() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <header className="app-header">
        <Link className="app-header__brand" href={routes.items}>
          Films Catalog
        </Link>
      </header>
    );
  }

  return (
    <header className="app-header">
      <Link className="app-header__brand" href={routes.items}>
        Films Catalog
      </Link>

      <nav className="app-header__nav" aria-label="Основна навігація">
        {session ? (
          <>
            <Link href={routes.favorites}>Обране</Link>

            <span className="app-header__user">
              {session.user.name}
            </span>

            <SignOutButton />
          </>
        ) : (
          <>
            <Link href={routes.login}>Увійти</Link>

            <Link className="header-register" href={routes.register}>
              Реєстрація
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
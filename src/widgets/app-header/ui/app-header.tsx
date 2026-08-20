import Link from "next/link";

import { routes } from "@/config/constants";
import { getCurrentSession } from "@/entities/session";
import { SignOutButton } from "@/features/auth-by-email/ui/sign-out-button";

export async function AppHeader() {
  const session = await getCurrentSession();

  return (
    <header className="app-header">
      <Link className="app-header__brand" href={routes.items}>Films Catalog</Link>
      <nav className="app-header__nav" aria-label="Основна навігація">
        {session ? (
          <><Link href={routes.favorites}>Обране</Link><span className="app-header__user">{session.user.name}</span><SignOutButton /></>
        ) : (
          <><Link href={routes.login}>Увійти</Link><Link className="header-register" href={routes.register}>Реєстрація</Link></>
        )}
      </nav>
    </header>
  );
}

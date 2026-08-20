import { AuthForm } from "@/features/auth-by-email/ui/auth-form";
import { getSafeCallbackUrl } from "@/shared/lib/get-safe-callback-url";

type LoginPageProps = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return <main className="auth-shell"><AuthForm mode="login" callbackUrl={getSafeCallbackUrl(next)} /></main>;
}

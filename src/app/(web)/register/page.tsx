import { AuthForm } from "@/features/auth-by-email/ui/auth-form";
import { getSafeCallbackUrl } from "@/shared/lib/get-safe-callback-url";

type RegisterPageProps = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { next } = await searchParams;

  return <main className="auth-shell"><AuthForm mode="register" callbackUrl={getSafeCallbackUrl(next)} /></main>;
}

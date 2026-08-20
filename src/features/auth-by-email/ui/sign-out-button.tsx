"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { routes } from "@/config/constants";
import { authClient } from "@/shared/api/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const signOut = async () => {
    setIsPending(true);
    const { error } = await authClient.signOut();

    if (!error) {
      queryClient.clear();
      router.replace(routes.items);
      router.refresh();
      return;
    }

    setIsPending(false);
  };

  return <button className="sign-out-button" type="button" disabled={isPending} onClick={signOut}>{isPending ? "Виходимо…" : "Вийти"}</button>;
}

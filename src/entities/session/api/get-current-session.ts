import "server-only";

import { headers } from "next/headers";

import { auth } from "@/shared/api/auth";

export async function getCurrentSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

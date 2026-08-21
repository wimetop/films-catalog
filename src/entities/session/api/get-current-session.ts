import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/shared/api/auth";

export const getCurrentSession = cache(async () => {
  // console.log("!!!!!getCurrentSession ISSSS CALLED!!!!!");
  return auth.api.getSession({
    headers: await headers(),
  });
});

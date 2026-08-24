import { NextResponse } from "next/server";

import { getFavoriteItemIds } from "@/entities/favorite/api/server";
import { getCurrentSession } from "@/entities/session";
import { allowRequest } from "@/server/rate-limit/redis-rate-limit";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!await allowRequest(`favorites-read:${session.user.id}`, 120)) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  return NextResponse.json(await getFavoriteItemIds(session.user.id));
}

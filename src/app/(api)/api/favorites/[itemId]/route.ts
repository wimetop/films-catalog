import { NextResponse } from "next/server";

import { removeFavorite } from "@/entities/favorite/api/server";
import { getCurrentSession } from "@/entities/session";
import { allowRequest } from "@/server/rate-limit/redis-rate-limit";
import { isUuid } from "@/shared/lib/is-uuid";

type RemoveFavoriteRouteProps = { params: Promise<{ itemId: string }> };

export async function DELETE(_: Request, { params }: RemoveFavoriteRouteProps) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!await allowRequest(`favorites-write:${session.user.id}`, 30)) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  const { itemId } = await params;
  if (!isUuid(itemId)) return NextResponse.json({ message: "Invalid item id" }, { status: 400 });

  await removeFavorite(session.user.id, itemId);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { addFavorite, getFavoriteItems } from "@/entities/favorite/api/server";
import { isForeignKeyViolation } from "@/entities/favorite/model/favorite-errors";
import { getCurrentSession } from "@/entities/session";
import { allowRequest } from "@/server/rate-limit/redis-rate-limit";
import { isUuid } from "@/shared/lib/is-uuid";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!await allowRequest(`favorites-read:${session.user.id}`, 120)) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  return NextResponse.json(await getFavoriteItems(session.user.id));
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!await allowRequest(`favorites-write:${session.user.id}`, 30)) return NextResponse.json({ message: "Too many requests" }, { status: 429 });

  const body: unknown = await request.json().catch(() => null);
  const itemId = typeof body === "object" && body !== null && "itemId" in body ? body.itemId : null;

  if (typeof itemId !== "string" || !isUuid(itemId)) {
    return NextResponse.json({ message: "Invalid item id" }, { status: 400 });
  }

  try {
    const added = await addFavorite(session.user.id, itemId);

    if (!added) return NextResponse.json({ message: "Item not found" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    throw error;
  }
}

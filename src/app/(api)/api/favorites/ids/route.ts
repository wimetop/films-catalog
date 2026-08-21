import { NextResponse } from "next/server";

import { getFavoriteItemIds } from "@/entities/favorite/api/server";
import { getCurrentSession } from "@/entities/session";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getFavoriteItemIds(session.user.id));
}

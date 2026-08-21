import { NextResponse } from "next/server";

import { createItem, getItems, revalidateCatalog } from "@/entities/item";
import { getCurrentSession } from "@/entities/session";

export async function GET() {
  return NextResponse.json(await getItems());
}

function readText(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const title = readText(payload, "title");

  if (!title) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const created = await createItem({
    description: readText(payload, "description"),
    imageUrl: readText(payload, "imageUrl"),
    title,
  });

  revalidateCatalog();

  return NextResponse.json(created, { status: 201 });
}

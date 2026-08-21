import { NextResponse } from "next/server";

import { createItem, getItems, revalidateCatalog } from "@/entities/item";
import { getCurrentSession } from "@/entities/session";
import { allowRequest, requestRateLimitIdentity } from "@/server/rate-limit/redis-rate-limit";

function positiveInt(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

export async function GET(request: Request) {
  if (!await allowRequest(`items:${requestRateLimitIdentity(request)}`)) return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  const { searchParams } = new URL(request.url);
  const pageValue = searchParams.get("page");
  const pageSizeValue = searchParams.get("pageSize");
  if (!pageValue && !pageSizeValue) return NextResponse.json(await getItems());
  const page = positiveInt(pageValue, 1, 10_000);
  const pageSize = positiveInt(pageSizeValue, 20, 100);
  return NextResponse.json({ items: await getItems(page, pageSize), page, pageSize });
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

  await revalidateCatalog();

  return NextResponse.json(created, { status: 201 });
}

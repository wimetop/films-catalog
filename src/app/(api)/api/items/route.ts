import { getItems } from "@/entities/item";

export async function GET() {
  return Response.json(await getItems());
}

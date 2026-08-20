import { routes } from "@/config/constants";

export function getSafeCallbackUrl(value: string | undefined): string {
  if (value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return value;

  return routes.favorites;
}

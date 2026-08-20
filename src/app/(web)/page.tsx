import { redirect } from "next/navigation";

import { routes } from "@/config/constants";

export default function HomePage() {
  redirect(routes.items);
}

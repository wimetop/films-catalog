import type { Metadata } from "next";

import { Providers } from "./providers";
import "./globals.css";
import { AppHeader } from "@/widgets/app-header/ui/app-header";

export const metadata: Metadata = {
  title: "Films Catalog",
  description: "Каталог фільмів із персональним обраним.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <body><Providers><AppHeader />{children}</Providers></body>
    </html>
  );
}

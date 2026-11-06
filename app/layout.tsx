import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loxada — Manga & Light Novel",
  description: "Loxada Manga & Light Novel application",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

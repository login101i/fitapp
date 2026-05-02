import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitApp — waga i nawyki",
  description: "Dziennik wagi i nawyków żywieniowych",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased">{children}</body>
    </html>
  );
}

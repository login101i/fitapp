import type { Metadata } from "next";
import "./globals.css";
import { PhotoBackground } from "@/components/PhotoBackground";

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
      <body className="relative min-h-dvh antialiased text-[var(--text)]">
        <PhotoBackground />
        <div className="relative z-10 min-h-dvh pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
          {children}
        </div>
      </body>
    </html>
  );
}

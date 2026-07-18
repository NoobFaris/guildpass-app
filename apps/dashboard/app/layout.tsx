import type { Metadata } from "next";
import "./globals.css";
import { GuildProvider } from "@/lib/guild/GuildProvider";

export const metadata: Metadata = {
  title: "GuildPass Dashboard",
  description: "GuildPass web dashboard for managing access, passes, and communities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GuildProvider>{children}</GuildProvider>
      </body>
    </html>
  );
}

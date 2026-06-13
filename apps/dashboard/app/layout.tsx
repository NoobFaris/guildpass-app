import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}

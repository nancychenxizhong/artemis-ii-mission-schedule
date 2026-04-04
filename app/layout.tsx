import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artemis II mission schedule",
  description:
    "A simple, shareable Artemis II milestone table with NASA time, UTC, baseline plan, latest public status, and source freshness.",
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

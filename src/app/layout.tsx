import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapperino – Events in der Region",
  description:
    "Veranstaltungsübersicht für Hohenlohekreis, Main-Tauber-Kreis und Schwäbisch Hall",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="antialiased">{children}</body>
    </html>
  );
}

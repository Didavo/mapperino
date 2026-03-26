import type { NextConfig } from "next";

const securityHeaders = [
  // Verhindert MIME-Type-Sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Verhindert Einbettung in iframes (Clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Erzwingt HTTPS für 2 Jahre (nur in Produktion sinnvoll)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Referrer nur bei gleicher Origin senden
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Geolocation nur für die eigene Seite erlauben, kein Zugriff auf Kamera/Mikrofon
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
  // Content Security Policy
  // - script/style unsafe-inline: Next.js und MapLibre benötigen das
  // - connect-src: Kartenkacheln von openfreemap.org
  // - img-src https:: Event-Bilder kommen von beliebigen https-Quellen
  // - worker-src blob:: MapLibre GL nutzt Web Worker über blob: URLs
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://tiles.openfreemap.org https://*.openfreemap.org",
      "font-src 'self'",
      "worker-src blob:",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

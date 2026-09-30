import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";

// Geist, subconjunto latino y pesos 400–850 (los que usan la landing y la plataforma).
// Un solo archivo precargado; ver app/fonts/README.md.
const geistSans = localFont({
  src: "./fonts/geist-latin-400-850.woff2",
  weight: "400 850",
  style: "normal",
  display: "swap",
  variable: "--font-geist-sans",
  // "Geist Fallback" is declared in globals.css with metrics matched to Geist to avoid layout shift.
  fallback: ["Geist Fallback", "Arial", "sans-serif"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: { default: "BOND | Prefactibilidad territorial energética", template: "%s | BOND" },
    description:
      "Plataforma de prefactibilidad territorial para evaluar, comparar y justificar sitios energéticos en Colombia.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "BOND | Prefactibilidad territorial energética",
      description: "Decisiones Go, Conditional Go o No-Go mediante análisis GIS y scoring multicriterio.",
      images: [{ url: imageUrl, width: 1733, height: 910, alt: "BOND — Prefactibilidad territorial energética" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "BOND | Prefactibilidad territorial energética",
      description: "Decisiones energéticas trazables con análisis GIS y scoring multicriterio.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={geistSans.variable}>{children}</body>
    </html>
  );
}

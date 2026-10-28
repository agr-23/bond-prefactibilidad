import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { landing } from "../content/landing";
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
  // TODO(bond): imagen Open Graph de la landing (raster, 1200 × 630): relieve en perspectiva
  // con el polígono cian y el titular "Conozca su terreno antes de comprometer capital".
  // Mientras tanto se usa /og.png (captura de la plataforma, 1733 × 910).
  const imageUrl = new URL("/og.png", `${protocol}://${host}`).toString();
  const { meta } = landing;

  return {
    title: { default: meta.title, template: "%s | BOND" },
    description: meta.description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      locale: meta.locale,
      siteName: "BOND",
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [{ url: imageUrl, width: 1733, height: 910, alt: "BOND — Prefactibilidad territorial energética" }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className={geistSans.variable}>{children}</body>
    </html>
  );
}

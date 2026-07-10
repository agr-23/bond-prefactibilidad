import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = new URL("/og.png", `${protocol}://${host}`).toString();

  return {
    title: "BOND | Prefactibilidad territorial energética",
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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}

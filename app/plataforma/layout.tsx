import type { Metadata } from "next";
import MapLibreStyles from "../MapLibreStyles";

export const metadata: Metadata = {
  title: "Plataforma",
};

export default function PlataformaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MapLibreStyles />
      {children}
    </>
  );
}

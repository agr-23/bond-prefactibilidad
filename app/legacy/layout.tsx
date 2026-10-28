import MapLibreStyles from "../MapLibreStyles";

export default function LegacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <MapLibreStyles />
      {children}
    </>
  );
}

import { landing } from "../../content/landing";

/** Datos estructurados de la organización. TODO(bond): reemplazar los datos provisionales en content/landing.ts. */
export default function JsonLd() {
  const { org, meta } = landing;
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: org.name,
    legalName: org.legalName,
    url: meta.siteUrl,
    email: org.email,
    description: org.description,
    areaServed: { "@type": "Country", name: org.country },
    address: { "@type": "PostalAddress", addressLocality: org.city, addressCountry: "CO" },
  };

  return (
    <script
      type="application/ld+json"
      // JSON serializado sin "<" para que no pueda cerrar la etiqueta.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

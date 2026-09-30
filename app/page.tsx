import type { Metadata } from "next";
import { landing } from "../content/landing";
import Audiences from "../components/landing/Audiences";
import Colombia from "../components/landing/Colombia";
import Contact from "../components/landing/Contact";
import Decision from "../components/landing/Decision";
import Deliverables from "../components/landing/Deliverables";
import Dimensions from "../components/landing/Dimensions";
import Faq from "../components/landing/Faq";
import Footer from "../components/landing/Footer";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import JsonLd from "../components/landing/JsonLd";
import LandingStyles from "../components/landing/LandingStyles";
import Nav from "../components/landing/Nav";
import Problem from "../components/landing/Problem";
import RevealObserver from "../components/landing/RevealObserver";
import Technologies from "../components/landing/Technologies";
import Transparency from "../components/landing/Transparency";
import type { ContactOutcome } from "../components/landing/ContactForm";
import { contactDestination } from "../lib/landing/contact-delivery";

export const metadata: Metadata = {
  // TODO(bond): el canonical usa el dominio provisional de content/landing.ts.
  alternates: { canonical: `${landing.meta.siteUrl}/` },
};

type SearchParams = Record<string, string | string[] | undefined>;

const outcomes: ContactOutcome[] = ["enviado", "revisar", "sin-destino", "error"];

export default async function Home({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = (await searchParams) ?? {};
  const outcome = outcomes.find((value) => value === params.contacto);
  // Sin destino configurado, el formulario lo advierte antes de que alguien lo llene.
  const connected = contactDestination() !== null;

  return (
    <div className="lx lx-root">
      <LandingStyles />
      <a className="lx-skip" href="#contenido">
        {landing.nav.skipLink}
      </a>
      <Nav nav={landing.nav} />
      <main id="contenido" tabIndex={-1}>
        <Hero />
        <Problem />
        <HowItWorks />
        <Dimensions />
        <Decision />
        <Technologies />
        <Colombia />
        <Deliverables />
        <Audiences />
        <Transparency />
        <Faq />
        <Contact connected={connected} outcome={outcome} />
      </main>
      <Footer />
      <JsonLd />
      <RevealObserver />
    </div>
  );
}

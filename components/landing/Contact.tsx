import { landing } from "../../content/landing";
import ContactForm, { type ContactOutcome } from "./ContactForm";
import { SectionIntro } from "./ui";

export default function Contact({ connected, outcome }: { connected: boolean; outcome?: ContactOutcome }) {
  const { contact: section, org } = landing;

  return (
    <section id={section.id} className="lx-deep lx-section bg-canvas text-ink" aria-labelledby={`${section.id}-title`}>
      <div className="lx-container lx-contact">
        <SectionIntro id={section.id} eyebrow={section.eyebrow} title={section.title} lead={section.lead} />
        <ContactForm copy={section.form} email={org.email} connected={connected} outcome={outcome} />
      </div>
    </section>
  );
}

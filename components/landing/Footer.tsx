import { landing } from "../../content/landing";

const isPlaceholder = (value: string) => value.startsWith("[");

export default function Footer() {
  const { org, footer, nav } = landing;
  const year = new Date().getFullYear();

  return (
    <footer className="lx-deep lx-footer bg-canvas text-ink">
      <div className="lx-container">
        <div className="lx-footer-top">
          <p className="lx-brand">{nav.brand}</p>
          <p className="lx-footer-tagline">{footer.tagline}</p>
          <a className="lx-link" href={nav.platform.href}>
            {nav.platform.label}
          </a>
        </div>
        <div className="lx-footer-meta">
          {/* TODO(bond): nombre legal, ciudad y correo definitivos (content/landing.ts → org). */}
          <address className="lx-footer-address">
            <span>{org.legalName}</span>
            <span>
              {org.city}, {org.country}
            </span>
            {isPlaceholder(org.email) ? <span>{org.email}</span> : <a href={`mailto:${org.email}`}>{org.email}</a>}
          </address>
          <ul className="lx-footer-links">
            {footer.legalLinks.map((link) => (
              <li key={link.label}>
                {/* TODO(bond): enlazar los documentos legales. */}
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
          <p className="lx-footer-disclaimer">{footer.disclaimer}</p>
          <p className="lx-footer-rights">
            © {year} {org.legalName}. {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}

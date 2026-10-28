import { landing } from "../../content/landing";
import { areaPath, edgePaths } from "./art/geometry";
import { HERO_VIEWBOX, heroArea } from "./art/hero-projection";
import { Chevron, cssVars } from "./ui";

export default function Hero() {
  const { hero } = landing;
  const edges = edgePaths(heroArea);
  const [, , width, height] = HERO_VIEWBOX;
  const viewBox = HERO_VIEWBOX.join(" ");

  return (
    <section id="inicio" className="lx-deep lx-hero bg-canvas text-ink" aria-labelledby="inicio-title">
      {/* Relieve ya proyectado en perspectiva (scripts/generate-landing-terrain.mjs): SVG 2D, sin 3D en CSS. */}
      <div className="lx-hero-art" aria-hidden="true">
        <svg className="lx-hero-relief" viewBox={viewBox}>
          <use href="/landing/relieve.svg#hero" width={width} height={height} />
        </svg>
        <svg className="lx-hero-trace" viewBox={viewBox}>
          <path className="lx-trace-fill" d={areaPath(heroArea)} style={cssVars({ "--n": edges.length })} />
          {edges.map((d, i) => (
            <path key={d} className="lx-trace-edge" d={d} pathLength={1} style={cssVars({ "--i": i })} />
          ))}
          {heroArea.map(([x, y], i) => (
            <circle key={`${x}-${y}`} className="lx-trace-vertex" cx={x} cy={y} r={3.5} style={cssVars({ "--i": i })} />
          ))}
        </svg>
      </div>

      <div className="lx-container lx-hero-copy">
        <div className="lx-hero-copy-inner">
          <p className="lx-eyebrow lx-rise" style={cssVars({ "--d": "60ms" })}>
            {hero.eyebrow}
          </p>
          <h1 id="inicio-title" className="lx-hero-title lx-rise" style={cssVars({ "--d": "160ms" })}>
            <span className="lx-hero-title-a">{hero.titleLines[0]}</span>{" "}
            <span className="lx-hero-title-b">{hero.titleLines[1]}</span>
          </h1>
          <p className="lx-lead lx-hero-lead lx-rise" style={cssVars({ "--d": "320ms" })}>
            {hero.lead}
          </p>
          <div className="lx-actions lx-rise" style={cssVars({ "--d": "460ms" })}>
            <a className="lx-btn" href={hero.primaryCta.href}>
              {hero.primaryCta.label}
            </a>
            <a className="lx-link" href={hero.secondaryCta.href}>
              {hero.secondaryCta.label}
              <Chevron />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

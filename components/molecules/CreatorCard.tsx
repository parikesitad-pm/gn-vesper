/**
 * A small creator attribution element. Used in the knowledge tray and once in the page footer — not on every
 * action result, so it never turns the interface into a promotion.
 *
 * It inherits `currentColor`, so the same component reads correctly on the notch's dark glass and on the
 * page's theme-aware surface.
 */
import type { Copy } from "@/lib/copy";
import "./CreatorCard.css";

const CREATOR_URL = "https://d-ap.my.id";

export function CreatorCard({ copy, compact = false }: { copy: Copy; compact?: boolean }) {
  return (
    <div className={`creator-card${compact ? " creator-card-compact" : ""}`}>
      <span className="creator-kicker">{copy.creator.label}</span>
      <a className="creator-name" href={CREATOR_URL} target="_blank" rel="noopener noreferrer">
        <strong>dap_</strong>
        <span>{copy.creator.name}</span>
      </a>
      <a className="creator-site" href={CREATOR_URL} target="_blank" rel="noopener noreferrer">
        {copy.creator.site} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

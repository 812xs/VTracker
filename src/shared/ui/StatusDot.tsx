import "./status-dot.css";

export type Tone = "ok" | "warn" | "off";

/** Renk tek başına anlam taşımaz; yanında her zaman metin durur. */
export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`status-dot status-dot--${tone}`} aria-hidden="true" />;
}

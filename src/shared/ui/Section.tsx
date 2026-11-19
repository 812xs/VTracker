import type { ReactNode } from "react";
import "./section.css";

interface SectionProps {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
}

/** Kartsız bölüm: küçük etiket ve altında doğrudan panel(ler). */
export function Section({ title, aside, children }: SectionProps) {
  return (
    <section className="section">
      {title !== undefined || aside ? (
        <header className="section__head">
          {title !== undefined ? <h2 className="section__title">{title}</h2> : <span />}
          {aside ? <span className="section__aside">{aside}</span> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

interface PanelProps {
  className?: string;
  children: ReactNode;
}

/** Tek yüzey alanı. */
export function Panel({ className, children }: PanelProps) {
  return <div className={className ? `panel ${className}` : "panel"}>{children}</div>;
}

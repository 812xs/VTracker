import type { ReactNode } from "react";
import "./card.css";

interface CardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Card({ title, action, children }: CardProps) {
  return (
    <section className="card">
      {title !== undefined || action ? (
        <header className="card__head">
          {title !== undefined ? <h2 className="card__title">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

import { Panel } from "./Section";
import "./state.css";

interface EmptyStateProps {
  message: string;
}

/** Ortak boş durum: alanın içinde tek cümle. */
export function EmptyState({ message }: EmptyStateProps) {
  return (
    <Panel>
      <p className="empty__text">{message}</p>
    </Panel>
  );
}

interface SkeletonProps {
  rows?: number;
}

/** Yüklenirken yerleşimi koruyan iskelet. */
export function Skeleton({ rows = 4 }: SkeletonProps) {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Yükleniyor">
      {Array.from({ length: rows }, (_, i) => (
        <div className="skeleton__row" key={i} />
      ))}
    </div>
  );
}

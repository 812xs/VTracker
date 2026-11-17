import { Icon } from "../icons/icons";
import { isTauri } from "../session/tauri";
import "./state.css";

interface RefreshButtonProps {
  onClick: () => void;
  busy?: boolean;
}

/** Yalnızca Tauri içinde görünür. */
export function RefreshButton({ onClick, busy = false }: RefreshButtonProps) {
  if (!isTauri()) return null;
  return (
    <button
      type="button"
      className="refresh"
      onClick={onClick}
      disabled={busy}
      aria-label="Yenile"
    >
      <Icon name="refresh" width={16} height={16} />
      <span>Yenile</span>
    </button>
  );
}

interface EmptyStateProps {
  message: string;
  onRefresh?: () => void;
}

/** Ortak boş durum: tek cümle ve (Tauri içindeyse) yenile düğmesi. */
export function EmptyState({ message, onRefresh }: EmptyStateProps) {
  return (
    <div className="empty">
      <p className="empty__text">{message}</p>
      {onRefresh ? <RefreshButton onClick={onRefresh} /> : null}
    </div>
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

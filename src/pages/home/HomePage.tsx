import { Card } from "../../shared/ui/Card";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import type { Phase, Snapshot } from "../../shared/session/types";
import "./home.css";

interface HomePageProps {
  snapshot: Snapshot | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const PHASE_TEXT: Record<Phase, string> = {
  closed: "Valorant kapalı.",
  waiting: "Maç bekleniyor.",
  agentSelect: "Ajan seçimi sürüyor.",
  inMatch: "Maç sürüyor.",
};

export default function HomePage({ snapshot, loading, error, onRefresh }: HomePageProps) {
  if (!snapshot) {
    return (
      <Card title="Ana Sayfa">
        {loading ? (
          <Skeleton rows={2} />
        ) : (
          <EmptyState message={error ?? "Oturum verisi yok."} onRefresh={onRefresh} />
        )}
      </Card>
    );
  }

  const me = snapshot.me;
  const rank = me?.current ?? null;
  const parts: string[] = [];
  if (me?.name) parts.push(me.name);
  if (rank) parts.push(rank.name);
  if (rank && rank.rr !== null) parts.push(`${rank.rr} RR`);

  return (
    <Card title="Ana Sayfa">
      <p className="home__phase">
        <span
          className={
            snapshot.phase === "closed" ? "home__dot" : "home__dot home__dot--live"
          }
          aria-hidden="true"
        />
        {PHASE_TEXT[snapshot.phase]}
      </p>
      {parts.length > 0 ? <p className="home__self">{parts.join(" · ")}</p> : null}
    </Card>
  );
}

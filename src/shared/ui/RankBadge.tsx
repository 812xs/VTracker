import type { Rank } from "../session/types";
import "./rank.css";

interface RankBadgeProps {
  rank: Rank | null;
  withRr?: boolean;
}

export function RankBadge({ rank, withRr = false }: RankBadgeProps) {
  if (!rank) return <span className="rank rank--empty">—</span>;
  const rr = withRr && rank.rr !== null ? ` · ${rank.rr} RR` : "";
  return (
    <span className="rank">
      {rank.icon ? <img className="rank__icon" src={rank.icon} alt="" loading="lazy" /> : null}
      <span className="rank__text">
        {rank.name}
        {rr}
      </span>
    </span>
  );
}

import { Panel, Section } from "../../shared/ui/Section";
import { RankBadge } from "../../shared/ui/RankBadge";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import { formatDecimal } from "../../shared/format/format";
import type { MatchInfo, Player } from "../../shared/session/types";
import "./match.css";

interface MatchPageProps {
  match: MatchInfo | null;
  selectedPuuid: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (puuid: string) => void;
}

interface Team {
  id: string;
  label: string;
  players: Player[];
}

function teamLabel(id: string): string {
  if (id === "Blue") return "Mavi Takım";
  if (id === "Red") return "Kırmızı Takım";
  return id ? id : "Takım";
}

function groupTeams(players: Player[]): Team[] {
  const teams: Team[] = [];
  for (const p of players) {
    let t = teams.find((x) => x.id === p.team);
    if (!t) {
      t = { id: p.team, label: teamLabel(p.team), players: [] };
      teams.push(t);
    }
    t.players.push(p);
  }
  // Kendi takımın üstte.
  teams.sort((a, b) => Number(b.players.some((p) => p.isSelf)) - Number(a.players.some((p) => p.isSelf)));
  return teams;
}

export default function MatchPage({
  match,
  selectedPuuid,
  loading,
  error,
  onSelect,
}: MatchPageProps) {
  if (!match) {
    return loading ? (
      <Skeleton rows={8} />
    ) : (
      <EmptyState message={error ?? "Şu anda aktif bir maç yok."} />
    );
  }

  const teams = groupTeams(match.players);

  return (
    <div className="match">
      <Panel className="match__info">
        <span className="match__map">{match.mapName ?? "Harita"}</span>
        <span className="match__mode">{match.modeName}</span>
      </Panel>
      <div className="match__head" aria-hidden="true">
        <span>Oyuncu</span>
        <span>Seviye</span>
        <span>Ajan</span>
        <span>K/D</span>
        <span>Rank</span>
        <span>Zirve</span>
      </div>
      {teams.map((team) => (
        <Section title={team.label} key={team.id || "takim"}>
          <div className="match__rows">
            {team.players.map((p) => (
              <button
                type="button"
                key={p.puuid}
                className={
                  p.puuid === selectedPuuid ? "match__row match__row--selected" : "match__row"
                }
                onClick={() => onSelect(p.puuid)}
              >
                <span className="match__name">
                  {p.hidden || !p.name ? "Gizli" : p.name}
                  {p.isSelf ? <span className="match__you">Sen</span> : null}
                </span>
                <span>{p.level ?? "—"}</span>
                <span className="match__agent">{p.agentName ?? "—"}</span>
                <span>{formatDecimal(p.kd)}</span>
                <RankBadge rank={p.current} withRr />
                <RankBadge rank={p.peak} />
              </button>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

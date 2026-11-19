import { Panel, Section } from "../../shared/ui/Section";
import { RankBadge } from "../../shared/ui/RankBadge";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import { formatDecimal } from "../../shared/format/format";
import type { MatchInfo, Player, WeaponEntry } from "../../shared/session/types";
import "./match.css";

interface MatchPageProps {
  match: MatchInfo | null;
  selectedPuuid: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (puuid: string) => void;
}

// Satırda gösterilen silahlar: Vandal, Phantom, Operator, yakın dövüş.
const THUMBS = [
  { id: "9c82e19d-4575-0200-1a81-3eacf00cf872", name: "Vandal" },
  { id: "ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a", name: "Phantom" },
  { id: "a03b24d3-4319-996d-0f8c-94bbfba1dfc7", name: "Operator" },
  { id: "2f59173c-4bed-b6c3-2191-dea9b58be9c7", name: "Yakın dövüş" },
];

function Thumbs({ weapons }: { weapons: WeaponEntry[] }) {
  return (
    <span className="match__thumbs">
      {THUMBS.map((t) => {
        const w = weapons.find((x) => x.weaponId.toLowerCase() === t.id);
        return (
          <span
            key={t.id}
            className={w?.isDefault ? "thumb thumb--default" : "thumb"}
            title={w ? `${w.weaponName}: ${w.skinName}` : t.name}
          >
            {w?.skinIcon ? (
              <img className="thumb__img" src={w.skinIcon} alt={w.skinName} loading="lazy" />
            ) : null}
          </span>
        );
      })}
    </span>
  );
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
        <span>Silahlar</span>
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
                <Thumbs weapons={p.weapons} />
              </button>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}

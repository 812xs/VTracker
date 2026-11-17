import { Card } from "../../shared/ui/Card";
import { RankBadge } from "../../shared/ui/RankBadge";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import { formatDecimal } from "../../shared/format/format";
import type { Player } from "../../shared/session/types";
import "./player.css";

interface PlayerPageProps {
  player: Player | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function PlayerPage({ player, loading, error, onRefresh }: PlayerPageProps) {
  if (!player) {
    return (
      <Card title="Oyuncu Kartı">
        {loading ? (
          <Skeleton rows={4} />
        ) : (
          <EmptyState message={error ?? "Gösterilecek oyuncu yok."} onRefresh={onRefresh} />
        )}
      </Card>
    );
  }

  const name = player.hidden || !player.name ? "Gizli" : player.name;

  return (
    <div className="player">
      <Card title="Oyuncu Kartı">
        <div className="player__top">
          {player.cardImage ? (
            <img className="player__card" src={player.cardImage} alt="" />
          ) : null}
          {player.agentPortrait ? (
            <img className="player__portrait" src={player.agentPortrait} alt="" />
          ) : null}
          <dl className="player__facts">
            <div>
              <dt>Ad</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>Seviye</dt>
              <dd>{player.level ?? "—"}</dd>
            </div>
            <div>
              <dt>Ajan</dt>
              <dd>{player.agentName ?? "—"}</dd>
            </div>
            <div>
              <dt>Güncel rank</dt>
              <dd>
                <RankBadge rank={player.current} />
              </dd>
            </div>
            <div>
              <dt>RR</dt>
              <dd>{player.current?.rr ?? "—"}</dd>
            </div>
            <div>
              <dt>Zirve rank</dt>
              <dd>
                <RankBadge rank={player.peak} />
              </dd>
            </div>
            <div>
              <dt>K/D</dt>
              <dd>{formatDecimal(player.kd)}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <Card title="Envanter">
        {player.weapons.length === 0 ? (
          <EmptyState message="Bu oyuncunun silah envanteri şu anda görünmüyor." />
        ) : (
          <ul className="player__weapons">
            {player.weapons.map((w) => (
              <li
                key={w.weaponId}
                className={w.isDefault ? "weapon weapon--default" : "weapon"}
              >
                {w.skinIcon ? (
                  <img className="weapon__img" src={w.skinIcon} alt="" loading="lazy" />
                ) : (
                  <span className="weapon__img" />
                )}
                <span className="weapon__skin">{w.skinName}</span>
                <span className="weapon__name">{w.weaponName}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

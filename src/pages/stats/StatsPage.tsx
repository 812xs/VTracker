import { Card } from "../../shared/ui/Card";
import { RankBadge } from "../../shared/ui/RankBadge";
import { EmptyState, RefreshButton, Skeleton } from "../../shared/ui/State";
import { formatDate, formatDecimal, formatTime } from "../../shared/format/format";
import { useCommand } from "../../shared/session/useSnapshot";
import type { MatchRow, MyStats } from "../../shared/session/types";
import "./stats.css";

function resultText(won: boolean | null): string {
  if (won === true) return "Galibiyet";
  if (won === false) return "Mağlubiyet";
  return "Beraberlik";
}

function rrText(v: number | null): string {
  if (v === null) return "—";
  return v > 0 ? `+${v}` : `${v}`;
}

function Row({ m }: { m: MatchRow }) {
  return (
    <tr>
      <td>
        {formatDate(m.startedAt)} {formatTime(m.startedAt)}
      </td>
      <td>{m.mapName ?? "—"}</td>
      <td>{m.agentName ?? "—"}</td>
      <td className={m.won === true ? "stats__win" : undefined}>{resultText(m.won)}</td>
      <td>
        {m.kills}/{m.deaths}/{m.assists}
      </td>
      <td>{Math.round(m.acs)}</td>
      <td>{rrText(m.rrChange)}</td>
    </tr>
  );
}

export default function StatsPage() {
  const { data, loading, error, reload } = useCommand<MyStats>("get_my_stats");

  if (!data) {
    return (
      <Card title="İstatistiklerim">
        {loading ? (
          <Skeleton rows={6} />
        ) : (
          <EmptyState message={error ?? "İstatistik verisi yok."} onRefresh={reload} />
        )}
      </Card>
    );
  }

  return (
    <div className="stats">
      <Card title="İstatistiklerim" action={<RefreshButton onClick={reload} busy={loading} />}>
        <div className="stats__tiles">
          <div className="stats__tile">
            <span className="stats__label">Güncel rank</span>
            <RankBadge rank={data.current} />
          </div>
          <div className="stats__tile">
            <span className="stats__label">RR</span>
            <span className="stats__value">{data.current?.rr ?? "—"}</span>
          </div>
          <div className="stats__tile">
            <span className="stats__label">Zirve rank</span>
            <RankBadge rank={data.peak} />
          </div>
          <div className="stats__tile">
            <span className="stats__label">Galibiyet oranı</span>
            <span className="stats__value">
              {data.winRate === null ? "—" : `%${formatDecimal(data.winRate, 1)}`}
            </span>
          </div>
          <div className="stats__tile">
            <span className="stats__label">K/D</span>
            <span className="stats__value">{formatDecimal(data.kd)}</span>
          </div>
          <div className="stats__tile">
            <span className="stats__label">Ort. ACS</span>
            <span className="stats__value">
              {data.avgAcs === null ? "—" : Math.round(data.avgAcs)}
            </span>
          </div>
        </div>
      </Card>

      <Card title="Son maçlar">
        {data.matches.length === 0 ? (
          <EmptyState message="Son dereceli maç bulunamadı." />
        ) : (
          <table className="stats__table">
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Harita</th>
                <th>Ajan</th>
                <th>Sonuç</th>
                <th>K/D/A</th>
                <th>ACS</th>
                <th>RR</th>
              </tr>
            </thead>
            <tbody>
              {data.matches.map((m) => (
                <Row key={m.matchId} m={m} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

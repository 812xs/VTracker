import { Panel, Section } from "../../shared/ui/Section";
import { RankBadge } from "../../shared/ui/RankBadge";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import { formatDate, formatDecimal, formatTime } from "../../shared/format/format";
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

interface StatsPageProps {
  data: MyStats | null;
  loading: boolean;
  error: string | null;
}

export default function StatsPage({ data, loading, error }: StatsPageProps) {
  if (!data) {
    return loading ? (
      <Skeleton rows={8} />
    ) : (
      <EmptyState message={error ?? "İstatistik verisi yok."} />
    );
  }

  return (
    <div className="stats">
      <div className="stats__tiles">
        <Panel className="stats__tile">
          <span className="stats__label">Güncel rank</span>
          <RankBadge rank={data.current} />
        </Panel>
        <Panel className="stats__tile">
          <span className="stats__label">RR</span>
          <span className="stats__value">{data.current?.rr ?? "—"}</span>
        </Panel>
        <Panel className="stats__tile">
          <span className="stats__label">Zirve rank</span>
          <RankBadge rank={data.peak} />
        </Panel>
        <Panel className="stats__tile">
          <span className="stats__label">Galibiyet oranı</span>
          <span className="stats__value">
            {data.winRate === null ? "—" : `%${formatDecimal(data.winRate, 1)}`}
          </span>
        </Panel>
        <Panel className="stats__tile">
          <span className="stats__label">K/D</span>
          <span className="stats__value">{formatDecimal(data.kd)}</span>
        </Panel>
        <Panel className="stats__tile">
          <span className="stats__label">Ort. ACS</span>
          <span className="stats__value">
            {data.avgAcs === null ? "—" : Math.round(data.avgAcs)}
          </span>
        </Panel>
      </div>

      <Section title="Son maçlar">
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
      </Section>
    </div>
  );
}

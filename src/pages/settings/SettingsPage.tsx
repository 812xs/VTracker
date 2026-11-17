import { Card } from "../../shared/ui/Card";
import { EmptyState, Skeleton } from "../../shared/ui/State";
import type { Status } from "../../shared/session/types";
import "./settings.css";

interface SettingsPageProps {
  status: Status | null;
  loading: boolean;
}

interface RowProps {
  label: string;
  on: boolean;
  onText: string;
  offText: string;
}

function Row({ label, on, onText, offText }: RowProps) {
  return (
    <li className="settings__row">
      <span>{label}</span>
      <span className="settings__state">
        <span
          className={on ? "settings__dot settings__dot--on" : "settings__dot"}
          aria-hidden="true"
        />
        {on ? onText : offText}
      </span>
    </li>
  );
}

export default function SettingsPage({ status, loading }: SettingsPageProps) {
  return (
    <Card title="Bağlantı">
      {status ? (
        <ul className="settings__list">
          <Row label="Riot Client" on={status.riotClient} onText="Bağlı" offText="Bağlı değil" />
          <Row label="Valorant" on={status.valorant} onText="Açık" offText="Kapalı" />
          <Row label="Veri" on={status.data} onText="Alınıyor" offText="Alınamıyor" />
        </ul>
      ) : loading ? (
        <Skeleton rows={3} />
      ) : (
        <EmptyState message="Bağlantı bilgisi yok." />
      )}
    </Card>
  );
}

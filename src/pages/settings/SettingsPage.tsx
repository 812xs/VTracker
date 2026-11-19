import { useState } from "react";
import { Section } from "../../shared/ui/Section";
import { StatusDot } from "../../shared/ui/StatusDot";
import { visibleConnections } from "../../shared/session/connection";
import { THEMES, applyTheme, loadTheme, saveTheme, type ThemeId } from "../../shared/settings/settings";
import type { Player, Status } from "../../shared/session/types";
import "./settings.css";

interface SettingsPageProps {
  status: Status | null;
  me: Player | null;
  showDiscord: boolean;
  onShowDiscord: (show: boolean) => void;
}

const PUBLISHER = "Vietra Teknoloji";

function appState(status: Status | null): string {
  if (!status) return "Bilgi yok";
  if (status.data) return "Veri alınıyor";
  if (status.riotClient || status.valorant) return "Veri bekleniyor";
  return "Riot Client kapalı";
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="settings__row">
      <span>{label}</span>
      <span className="settings__value">{value}</span>
    </li>
  );
}

export default function SettingsPage({ status, me, showDiscord, onShowDiscord }: SettingsPageProps) {
  const [theme, setTheme] = useState<ThemeId>(loadTheme);
  const [versionNote, setVersionNote] = useState<string | null>(null);

  const pickTheme = (id: ThemeId) => {
    setTheme(id);
    saveTheme(id);
    applyTheme(id);
  };

  const connections = visibleConnections(status, me, showDiscord);

  return (
    <div className="settings">
      <div className="settings__col">
        <Section title="VTracker Bilgileri">
          <ul className="settings__list">
            <InfoRow label="Sürüm" value={__APP_VERSION__} />
            <InfoRow label="Durum" value={appState(status)} />
            <InfoRow label="Yayıncı" value={PUBLISHER} />
          </ul>
        </Section>

        <Section title="Bağlantı Bilgileri">
          <ul className="settings__list">
            {connections.map((c) => (
              <li className="settings__row" key={c.key}>
                <span>{c.label}</span>
                <span className="settings__value settings__value--dot">
                  <StatusDot tone={c.tone} />
                  {c.text}
                </span>
              </li>
            ))}
            <li className="settings__row">
              <span id="discord-switch-label">Discord Bağlantısını Göster/Gizle</span>
              <button
                type="button"
                role="switch"
                aria-checked={showDiscord}
                aria-labelledby="discord-switch-label"
                className="switch"
                onClick={() => onShowDiscord(!showDiscord)}
              >
                <span className="switch__knob" />
              </button>
            </li>
          </ul>
        </Section>
      </div>

      <div className="settings__col">
        <Section title="Uygulama Teması">
          <div className="theme" role="radiogroup" aria-label="Uygulama Teması">
            {THEMES.map((t) => (
              <button
                type="button"
                role="radio"
                aria-checked={theme === t.id}
                key={t.id}
                className={theme === t.id ? "theme__opt theme__opt--active" : "theme__opt"}
                onClick={() => pickTheme(t.id)}
              >
                <span className={`theme__swatch theme__swatch--${t.id}`} aria-hidden="true" />
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section title="VTracker Sürüm">
          <ul className="settings__list">
            <li className="settings__row">
              <span>Yüklü sürüm</span>
              <span className="settings__value">{__APP_VERSION__}</span>
            </li>
          </ul>
          <button
            type="button"
            className="settings__action"
            onClick={() =>
              setVersionNote(
                `Yüklü sürüm ${__APP_VERSION__}. Bu derlemede güncelleme kanalı yok; yeni sürüm yayınlandığında elle indirilir.`,
              )
            }
          >
            VTracker Sürümünü Kontrol Et
          </button>
          {versionNote ? (
            <p className="settings__note" role="status">
              {versionNote}
            </p>
          ) : null}
        </Section>
      </div>
    </div>
  );
}

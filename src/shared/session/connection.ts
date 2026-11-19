import type { Player, Status } from "./types";
import type { Tone } from "../ui/StatusDot";

export type ConnectionKey = "riot" | "valorant" | "profile" | "discord";

export interface Connection {
  key: ConnectionKey;
  label: string;
  tone: Tone;
  text: string;
}

/**
 * Bağlantı satırları. Kaynak snapshot `status` ve oturumdaki kendi oyuncudur.
 * Yeşil: çalışıyor. Sarı: açık ama veri bekleniyor. Gri: kapalı / yok.
 * Bu sürümde Discord bağlantısı kurulmaz; satır her zaman gridir.
 */
export function connections(status: Status | null, me: Player | null): Connection[] {
  const riotOn = status?.riotClient === true;
  const valorantOn = status?.valorant === true;
  const dataOn = status?.data === true;

  const riot: Connection = riotOn
    ? { key: "riot", label: "Riot Client", tone: "ok", text: "Bağlı" }
    : { key: "riot", label: "Riot Client", tone: "off", text: status ? "Bağlı değil" : "Bilgi yok" };

  const valorant: Connection = !valorantOn
    ? { key: "valorant", label: "Valorant", tone: "off", text: status ? "Kapalı" : "Bilgi yok" }
    : dataOn
      ? { key: "valorant", label: "Valorant", tone: "ok", text: "Açık" }
      : { key: "valorant", label: "Valorant", tone: "warn", text: "Açık, veri bekleniyor" };

  const profile: Connection = me
    ? { key: "profile", label: "Profil Bilgisi", tone: "ok", text: "Alındı" }
    : riotOn || valorantOn
      ? { key: "profile", label: "Profil Bilgisi", tone: "warn", text: "Bekleniyor" }
      : { key: "profile", label: "Profil Bilgisi", tone: "off", text: status ? "Yok" : "Bilgi yok" };

  const discord: Connection = { key: "discord", label: "Discord", tone: "off", text: "Bağlı değil" };

  return [riot, valorant, profile, discord];
}

export function visibleConnections(
  status: Status | null,
  me: Player | null,
  showDiscord: boolean,
): Connection[] {
  return connections(status, me).filter((c) => showDiscord || c.key !== "discord");
}

/** Genel durum: Discord isteğe bağlıdır, hesaba katılmaz. */
export function overallTone(list: Connection[]): Tone {
  const core = list.filter((c) => c.key !== "discord");
  if (core.every((c) => c.tone === "ok")) return "ok";
  if (core.every((c) => c.tone === "off")) return "off";
  return "warn";
}

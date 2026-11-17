const LOCALE = "tr-TR";
const ZONE = "Europe/Istanbul";

const parts = new Intl.DateTimeFormat(LOCALE, {
  timeZone: ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function pick(ms: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of parts.formatToParts(new Date(ms))) out[p.type] = p.value;
  return out;
}

/** d.m.Y */
export function formatDate(ms: number): string {
  const p = pick(ms);
  return `${Number(p.day)}.${Number(p.month)}.${p.year}`;
}

/** HH:mm */
export function formatTime(ms: number): string {
  const p = pick(ms);
  return `${p.hour}:${p.minute}`;
}

const numberFormat = new Intl.NumberFormat(LOCALE);

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

export function formatDecimal(n: number | null, digits = 2): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Kalan süre: "2 gün 3 sa", "4 sa 12 dk", "35 dk". */
export function formatRemaining(expiresAt: number, now: number): string {
  const total = Math.max(0, Math.floor((expiresAt - now) / 60000));
  if (total <= 0) return "Süre doldu";
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days} gün ${hours} sa`;
  if (hours > 0) return `${hours} sa ${minutes} dk`;
  return `${minutes} dk`;
}

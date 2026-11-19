// Ayarlar yerel depolamada tutulur; depolama yoksa varsayılanlar geçerlidir.

export type ThemeId = "blue" | "yellow" | "green" | "red";

export interface ThemeOption {
  id: ThemeId;
  label: string;
}

export const THEMES: ThemeOption[] = [
  { id: "blue", label: "Mavi (Varsayılan)" },
  { id: "yellow", label: "Sarı" },
  { id: "green", label: "Yeşil" },
  { id: "red", label: "Kırmızı" },
];

const THEME_KEY = "shell-theme";
const DISCORD_KEY = "shell-discord";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* depolama yoksa ayar saklanmaz */
  }
}

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function loadTheme(): ThemeId {
  const v = read(THEME_KEY);
  return isThemeId(v) ? v : "blue";
}

export function saveTheme(id: ThemeId): void {
  write(THEME_KEY, id);
}

/** Temayı kök öğeye uygular; sayfa çizilmeden önce de çağrılır. */
export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
}

/** Discord satırı varsayılan olarak görünür. */
export function loadShowDiscord(): boolean {
  return read(DISCORD_KEY) !== "0";
}

export function saveShowDiscord(show: boolean): void {
  write(DISCORD_KEY, show ? "1" : "0");
}

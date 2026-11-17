import type { IconName } from "../../shared/icons/icons";

export type NavId = "home" | "match" | "stats" | "store" | "player" | "settings";

export interface NavItem {
  id: NavId;
  label: string;
  icon: IconName;
}

export const NAV_KEY = "shell-nav";

/** Üstte: ilk beş bölüm. Altta: Ayarlar. */
export const NAV_TOP: NavItem[] = [
  { id: "home", label: "Ana Sayfa", icon: "home" },
  { id: "match", label: "Maç Bilgisi", icon: "match" },
  { id: "stats", label: "İstatistiklerim", icon: "stats" },
  { id: "store", label: "Mağaza", icon: "store" },
  { id: "player", label: "Oyuncu Kartı", icon: "player" },
];

export const NAV_BOTTOM: NavItem[] = [
  { id: "settings", label: "Ayarlar", icon: "settings" },
];

const ALL = [...NAV_TOP, ...NAV_BOTTOM];

export function isNavId(value: unknown): value is NavId {
  return ALL.some((n) => n.id === value);
}

export function navLabel(id: NavId): string {
  return ALL.find((n) => n.id === id)?.label ?? "Ana Sayfa";
}

export function loadNav(): NavId {
  try {
    const v = window.localStorage.getItem(NAV_KEY);
    return isNavId(v) ? v : "home";
  } catch {
    return "home";
  }
}

export function saveNav(id: NavId): void {
  try {
    window.localStorage.setItem(NAV_KEY, id);
  } catch {
    /* depolama yoksa seçim saklanmaz */
  }
}

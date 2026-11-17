// Rust tarafındaki riot-core modelinin (camelCase) birebir karşılığı.

export type Phase = "closed" | "waiting" | "agentSelect" | "inMatch";

export interface Status {
  riotClient: boolean;
  valorant: boolean;
  data: boolean;
}

export interface Rank {
  tier: number;
  name: string;
  icon: string | null;
  rr: number | null;
}

export interface WeaponEntry {
  weaponId: string;
  weaponName: string;
  skinName: string;
  skinIcon: string | null;
  isDefault: boolean;
}

export interface Player {
  puuid: string;
  name: string | null;
  hidden: boolean;
  isSelf: boolean;
  team: string;
  level: number | null;
  agentName: string | null;
  agentPortrait: string | null;
  cardImage: string | null;
  kd: number | null;
  current: Rank | null;
  peak: Rank | null;
  weapons: WeaponEntry[];
}

export interface MatchInfo {
  id: string;
  mapName: string | null;
  mapImage: string | null;
  modeName: string;
  players: Player[];
}

export interface Snapshot {
  phase: Phase;
  status: Status;
  me: Player | null;
  match: MatchInfo | null;
}

export interface MatchRow {
  matchId: string;
  startedAt: number;
  mapName: string | null;
  agentName: string | null;
  agentPortrait: string | null;
  won: boolean | null;
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  rrChange: number | null;
}

export interface MyStats {
  current: Rank | null;
  peak: Rank | null;
  winRate: number | null;
  kd: number | null;
  avgAcs: number | null;
  matches: MatchRow[];
}

export interface Wallet {
  vp: number;
  radianite: number;
  kingdom: number;
}

export interface Offer {
  id: string;
  name: string;
  icon: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
}

export interface OfferList {
  offers: Offer[];
  expiresAt: number;
}

export interface Store {
  wallet: Wallet;
  daily: OfferList;
  nightMarket: OfferList | null;
}

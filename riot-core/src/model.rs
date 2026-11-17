use serde::Serialize;

#[derive(Serialize, Clone, Copy, PartialEq, Eq, Debug)]
#[serde(rename_all = "camelCase")]
pub enum Phase {
    Closed,
    Waiting,
    AgentSelect,
    InMatch,
}

#[derive(Serialize, Clone, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub riot_client: bool,
    pub valorant: bool,
    pub data: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Rank {
    pub tier: i32,
    pub name: String,
    pub icon: Option<String>,
    pub rr: Option<i32>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct WeaponEntry {
    pub weapon_id: String,
    pub weapon_name: String,
    pub skin_name: String,
    pub skin_icon: Option<String>,
    pub is_default: bool,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Player {
    pub puuid: String,
    pub name: Option<String>,
    pub hidden: bool,
    pub is_self: bool,
    pub team: String,
    pub level: Option<i64>,
    pub agent_name: Option<String>,
    pub agent_portrait: Option<String>,
    pub card_image: Option<String>,
    pub kd: Option<f64>,
    pub current: Option<Rank>,
    pub peak: Option<Rank>,
    pub weapons: Vec<WeaponEntry>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MatchInfo {
    pub id: String,
    pub map_name: Option<String>,
    pub map_image: Option<String>,
    pub mode_name: String,
    pub players: Vec<Player>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub phase: Phase,
    pub status: Status,
    pub me: Option<Player>,
    #[serde(rename = "match")]
    pub current_match: Option<MatchInfo>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MatchRow {
    pub match_id: String,
    pub started_at: i64,
    pub map_name: Option<String>,
    pub agent_name: Option<String>,
    pub agent_portrait: Option<String>,
    pub won: Option<bool>,
    pub kills: i64,
    pub deaths: i64,
    pub assists: i64,
    pub acs: f64,
    pub rr_change: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MyStats {
    pub current: Option<Rank>,
    pub peak: Option<Rank>,
    pub win_rate: Option<f64>,
    pub kd: Option<f64>,
    pub avg_acs: Option<f64>,
    pub matches: Vec<MatchRow>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub vp: i64,
    pub radianite: i64,
    pub kingdom: i64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Offer {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub price: i64,
    pub original_price: Option<i64>,
    pub discount_percent: Option<i64>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OfferList {
    pub offers: Vec<Offer>,
    pub expires_at: i64,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Store {
    pub wallet: Wallet,
    pub daily: OfferList,
    pub night_market: Option<OfferList>,
}

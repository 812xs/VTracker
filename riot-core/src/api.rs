use crate::assets::{st, Assets};
use crate::client::{remote_client, CoreError, Session, R};
use crate::model::*;
use futures::{stream, StreamExt};
use reqwest::Method;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

const VP_ID: &str = "85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741";
const RADIANITE_ID: &str = "e59aa87c-4cbf-517a-5983-6e81511be9b7";
const KINGDOM_ID: &str = "85ca954a-41f2-ce94-9b45-8ca3dd39a00d";
const ENRICH_TTL: Duration = Duration::from_secs(120);

static ASSETS: tokio::sync::OnceCell<Arc<Assets>> = tokio::sync::OnceCell::const_new();
static SNAP: Mutex<Option<(Instant, Snapshot)>> = Mutex::new(None);
static SNAP_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());
static ENRICH: OnceLock<Mutex<HashMap<String, (Instant, Enrich)>>> = OnceLock::new();
static DETAILS: OnceLock<Mutex<HashMap<String, Arc<Value>>>> = OnceLock::new();

#[derive(Clone, Default)]
struct Enrich {
    name: Option<String>,
    current: Option<Rank>,
    peak: Option<Rank>,
    kd: Option<f64>,
}

// ---------------------------------------------------------------- yardımcılar

fn int(v: &Value, key: &str) -> Option<i64> {
    v.get(key).and_then(|x| x.as_i64())
}

fn round2(x: f64) -> f64 {
    (x * 100.0).round() / 100.0
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

async fn assets() -> R<Arc<Assets>> {
    ASSETS
        .get_or_try_init(|| async {
            Assets::load(remote_client())
                .await
                .map(Arc::new)
                .map_err(|_| CoreError::Network)
        })
        .await
        .cloned()
}

fn make_rank(a: &Assets, tier: i64, rr: Option<i64>) -> Rank {
    let t = tier as i32;
    let (name, icon) = match a.tiers.get(&t) {
        Some(x) => (x.name.clone(), x.icon.clone()),
        None => (format!("Kademe {t}"), None),
    };
    Rank {
        tier: t,
        name,
        icon,
        rr: rr.map(|x| x as i32),
    }
}

fn mode_name(queue: &str) -> String {
    let q = queue.to_lowercase();
    let name = match q.as_str() {
        "competitive" => "Dereceli",
        "unrated" => "Derecesiz",
        "spikerush" => "Spike Rush",
        "deathmatch" => "Deathmatch",
        "ggteam" => "Escalation",
        "onefa" => "Replication",
        "swiftplay" => "Swiftplay",
        "hurm" => "Team Deathmatch",
        "premier" => "Premier",
        "snowball" => "Snowball Fight",
        "" | "custom" => "Özel Oyun",
        other => other,
    };
    name.to_string()
}

fn map_info(a: &Assets, map_id: &str) -> (Option<String>, Option<String>) {
    a.maps
        .get(&map_id.to_lowercase())
        .map(|m| (Some(m.name.clone()), m.image.clone()))
        .unwrap_or((None, None))
}

fn is_uuid(s: &str) -> bool {
    let b = s.as_bytes();
    b.len() == 36 && [8, 13, 18, 23].iter().all(|&i| b[i] == b'-')
}

/// Düğümün altındaki bütün UUID değerlerini (küçük harf) toplar. Yapı değişse de kimlikler bulunur.
fn collect_uuids(v: &Value, out: &mut Vec<String>) {
    match v {
        Value::String(s) if is_uuid(s) => {
            let l = s.to_lowercase();
            if !out.contains(&l) {
                out.push(l);
            }
        }
        Value::Array(a) => a.iter().for_each(|x| collect_uuids(x, out)),
        Value::Object(m) => m.values().for_each(|x| collect_uuids(x, out)),
        _ => {}
    }
}

/// Bir silah yuvasındaki kimliklerden kaplamayı çözer: renk varyantı, seviye ve ana kaplama taranır.
/// Standart kaplamada silahın kendi görseli, diğerlerinde renk varyantının asıl görseli kullanılır.
fn resolve_weapon(a: &Assets, weapon_id: &str, ids: &[String]) -> Option<WeaponEntry> {
    let w = a.weapons.get(weapon_id)?;
    let chroma = ids.iter().find_map(|i| a.chromas.get(i));
    let level = ids.iter().find_map(|i| a.levels.get(i));
    let skin = ids
        .iter()
        .find_map(|i| a.skins.get(i))
        .or_else(|| level.and_then(|l| a.skins.get(&l.skin)))
        .or_else(|| chroma.and_then(|c| a.skins.get(&c.skin)));

    let Some(skin) = skin else {
        // Yuva var ama kaplama çözülemedi: standart kabul edilir.
        return Some(WeaponEntry {
            weapon_id: weapon_id.to_string(),
            weapon_name: w.name.clone(),
            skin_name: "Standart".to_string(),
            skin_icon: w.icon.clone(),
            is_default: true,
        });
    };

    let (skin_name, skin_icon) = if skin.is_default {
        ("Standart".to_string(), w.icon.clone().or_else(|| skin.icon.clone()))
    } else {
        (
            skin.name.clone(),
            chroma
                .and_then(|c| c.render.clone())
                .or_else(|| skin.icon.clone())
                .or_else(|| level.and_then(|l| l.icon.clone()))
                .or_else(|| w.icon.clone()),
        )
    };
    Some(WeaponEntry {
        weapon_id: weapon_id.to_string(),
        weapon_name: w.name.clone(),
        skin_name,
        skin_icon,
        is_default: skin.is_default,
    })
}

fn insert_item(map: &mut HashMap<String, Vec<String>>, weapon_id: &str, item: &Value) {
    let mut ids = Vec::new();
    collect_uuids(item, &mut ids);
    map.insert(weapon_id.to_lowercase(), ids);
}

/// `Items` nesne (anahtar silah kimliği) ya da dizi olabilir.
fn weapons_from_items(a: &Assets, items: &Value) -> Vec<WeaponEntry> {
    let mut by_weapon: HashMap<String, Vec<String>> = HashMap::new();
    match items {
        Value::Object(m) => {
            for (k, it) in m {
                let wid = st(it, "ID").unwrap_or_else(|| k.clone());
                insert_item(&mut by_weapon, &wid, it);
            }
        }
        Value::Array(arr) => {
            for it in arr {
                if let Some(wid) = st(it, "ID") {
                    insert_item(&mut by_weapon, &wid, it);
                }
            }
        }
        _ => {}
    }
    a.weapon_order
        .iter()
        .filter_map(|wid| by_weapon.get(wid).and_then(|ids| resolve_weapon(a, wid, ids)))
        .collect()
}

/// Kendi donatı (personalization): `Guns[]` içinde SkinID, SkinLevelID, ChromaID.
fn weapons_from_guns(a: &Assets, loadout: &Value) -> Vec<WeaponEntry> {
    let guns = loadout.get("Guns").and_then(|g| g.as_array());
    let mut out = Vec::new();
    for wid in &a.weapon_order {
        let gun = guns.into_iter().flatten().find(|g| {
            st(g, "ID")
                .map(|x| x.eq_ignore_ascii_case(wid))
                .unwrap_or(false)
        });
        let Some(g) = gun else { continue };
        let ids: Vec<String> = ["SkinID", "SkinLevelID", "ChromaID"]
            .iter()
            .filter_map(|k| st(g, k))
            .map(|x| x.to_lowercase())
            .collect();
        if let Some(e) = resolve_weapon(a, wid, &ids) {
            out.push(e);
        }
    }
    out
}

/// Yanıt `Loadouts` dizisi ya da düz dizi olabilir; kayıt `Loadout` altında ya da kökte olabilir.
fn loadout_entries(v: &Value) -> Vec<&Value> {
    v.get("Loadouts")
        .and_then(|x| x.as_array())
        .or_else(|| v.as_array())
        .map(|a| a.iter().collect())
        .unwrap_or_default()
}

fn loadout_map(v: &Value) -> HashMap<String, Value> {
    let mut out = HashMap::new();
    for e in loadout_entries(v) {
        let lo = match e.get("Loadout") {
            Some(l) if l.is_object() => l,
            _ => e,
        };
        let sub = st(lo, "Subject").or_else(|| st(e, "Subject"));
        if let (Some(sub), Some(items)) = (sub, lo.get("Items")) {
            out.insert(sub.to_lowercase(), items.clone());
        }
    }
    out
}

// ------------------------------------------------------------ ağ: maç detayı

async fn get_details(sess: &Session, id: &str) -> R<Option<Arc<Value>>> {
    let cache = DETAILS.get_or_init(|| Mutex::new(HashMap::new()));
    if let Some(v) = cache.lock().ok().and_then(|g| g.get(id).cloned()) {
        return Ok(Some(v));
    }
    let url = format!("{}/match-details/v1/matches/{id}", sess.pd()?);
    match sess.get(&url).await? {
        Some(v) => {
            let arc = Arc::new(v);
            if let Ok(mut g) = cache.lock() {
                if g.len() > 150 {
                    g.clear();
                }
                g.insert(id.to_string(), arc.clone());
            }
            Ok(Some(arc))
        }
        None => Ok(None),
    }
}

fn find_player<'a>(details: &'a Value, puuid: &str) -> Option<&'a Value> {
    details
        .get("players")?
        .as_array()?
        .iter()
        .find(|p| {
            st(p, "subject")
                .map(|x| x.eq_ignore_ascii_case(puuid))
                .unwrap_or(false)
        })
}

async fn comp_updates(sess: &Session, puuid: &str, count: usize) -> R<Vec<Value>> {
    let url = format!(
        "{}/mmr/v1/players/{puuid}/competitiveupdates?startIndex=0&endIndex={count}&queue=competitive",
        sess.pd()?
    );
    Ok(sess
        .get(&url)
        .await?
        .and_then(|v| v.get("Matches").and_then(|m| m.as_array()).cloned())
        .unwrap_or_default())
}

async fn kd_for(sess: &Session, puuid: &str) -> Option<f64> {
    let updates = comp_updates(sess, puuid, 3).await.ok()?;
    let (mut kills, mut deaths, mut any) = (0i64, 0i64, false);
    for u in &updates {
        let Some(id) = st(u, "MatchID") else { continue };
        let Ok(Some(d)) = get_details(sess, &id).await else {
            continue;
        };
        if let Some(stats) = find_player(&d, puuid).and_then(|p| p.get("stats")) {
            kills += int(stats, "kills").unwrap_or(0);
            deaths += int(stats, "deaths").unwrap_or(0);
            any = true;
        }
    }
    if any {
        Some(round2(kills as f64 / deaths.max(1) as f64))
    } else {
        None
    }
}

async fn mmr_ranks(sess: &Session, a: &Assets, puuid: &str) -> (Option<Rank>, Option<Rank>) {
    let Ok(pd) = sess.pd() else {
        return (None, None);
    };
    let url = format!("{pd}/mmr/v1/players/{puuid}");
    let Ok(Some(v)) = sess.get(&url).await else {
        return (None, None);
    };

    let latest = v.get("LatestCompetitiveUpdate");
    let current = latest.and_then(|l| {
        let tier = int(l, "TierAfterUpdate")?;
        Some(make_rank(a, tier, int(l, "RankedRatingAfterUpdate")))
    });

    let mut peak_tier = 0i64;
    let seasons = v
        .get("QueueSkills")
        .and_then(|q| q.get("competitive"))
        .and_then(|c| c.get("SeasonalInfoBySeasonID"))
        .and_then(|s| s.as_object());
    for season in seasons.into_iter().flat_map(|m| m.values()) {
        peak_tier = peak_tier.max(int(season, "CompetitiveTier").unwrap_or(0));
        if let Some(wins) = season.get("WinsByTier").and_then(|w| w.as_object()) {
            for k in wins.keys() {
                if let Ok(t) = k.parse::<i64>() {
                    peak_tier = peak_tier.max(t);
                }
            }
        }
    }
    let peak = if peak_tier > 0 {
        Some(make_rank(a, peak_tier, None))
    } else {
        None
    };
    (current, peak)
}

async fn fetch_names(sess: &Session, puuids: &[String]) -> HashMap<String, String> {
    let mut out = HashMap::new();
    let Ok(pd) = sess.pd() else { return out };
    let url = format!("{pd}/name-service/v2/players");
    if let Ok(Some(v)) = sess.send_json(Method::PUT, &url, &json!(puuids)).await {
        for e in v.as_array().into_iter().flatten() {
            if let (Some(sub), Some(name)) = (st(e, "Subject"), st(e, "GameName")) {
                let full = match st(e, "TagLine") {
                    Some(tag) => format!("{name}#{tag}"),
                    None => name,
                };
                out.insert(sub.to_lowercase(), full);
            }
        }
    }
    out
}

async fn enrich(sess: &Session, a: &Assets, puuids: &[String]) -> HashMap<String, Enrich> {
    let cache = ENRICH.get_or_init(|| Mutex::new(HashMap::new()));
    let now = Instant::now();
    let stale: Vec<String> = {
        let g = cache.lock().unwrap_or_else(|e| e.into_inner());
        puuids
            .iter()
            .filter(|p| {
                g.get(*p)
                    .map(|(t, _)| now.duration_since(*t) > ENRICH_TTL)
                    .unwrap_or(true)
            })
            .cloned()
            .collect()
    };

    if !stale.is_empty() {
        let names = fetch_names(sess, &stale).await;
        let results: Vec<(String, Enrich)> = stream::iter(stale)
            .map(move |p| {
                let name = names.get(&p).cloned();
                async move {
                    let (current, peak) = mmr_ranks(sess, a, &p).await;
                    let kd = kd_for(sess, &p).await;
                    (
                        p,
                        Enrich {
                            name,
                            current,
                            peak,
                            kd,
                        },
                    )
                }
            })
            .buffer_unordered(5)
            .collect()
            .await;
        let mut g = cache.lock().unwrap_or_else(|e| e.into_inner());
        for (p, e) in results {
            g.insert(p, (Instant::now(), e));
        }
    }

    let g = cache.lock().unwrap_or_else(|e| e.into_inner());
    puuids
        .iter()
        .filter_map(|p| g.get(p).map(|(_, e)| (p.clone(), e.clone())))
        .collect()
}

// ------------------------------------------------------------------ oyuncular

#[allow(clippy::too_many_arguments)]
fn build_player(
    a: &Assets,
    e: &Enrich,
    puuid: &str,
    self_id: &str,
    team: String,
    character: Option<String>,
    identity: &Value,
    weapons: Vec<WeaponEntry>,
) -> Player {
    let is_self = puuid.eq_ignore_ascii_case(self_id);
    let incognito = identity.get("Incognito").and_then(|x| x.as_bool()) == Some(true) && !is_self;
    let hide_level =
        identity.get("HideAccountLevel").and_then(|x| x.as_bool()) == Some(true) && !is_self;
    let agent = character
        .as_ref()
        .and_then(|c| a.agents.get(&c.to_lowercase()));
    let card_image = st(identity, "PlayerCardID").and_then(|c| a.cards.get(&c.to_lowercase()).cloned());
    Player {
        puuid: puuid.to_string(),
        name: if incognito { None } else { e.name.clone() },
        hidden: incognito,
        is_self,
        team,
        level: if hide_level {
            None
        } else {
            int(identity, "AccountLevel")
        },
        agent_name: agent.map(|x| x.name.clone()),
        agent_portrait: agent.and_then(|x| x.portrait.clone()),
        card_image,
        kd: e.kd,
        current: e.current.clone(),
        peak: e.peak.clone(),
        weapons,
    }
}

async fn build_me(sess: &Session, a: &Assets) -> R<Player> {
    let pd = sess.pd()?;
    let me_id = sess.puuid.to_lowercase();
    let ids = vec![me_id.clone()];
    let xp_url = format!("{pd}/account-xp/v1/players/{}", sess.puuid);
    let lo_url = format!("{pd}/personalization/v2/players/{}/playerloadout", sess.puuid);
    let (en, xp, lo) = tokio::join!(
        enrich(sess, a, &ids),
        sess.get(&xp_url),
        sess.get(&lo_url)
    );
    let e = en.get(&me_id).cloned().unwrap_or_default();
    let level = xp
        .ok()
        .flatten()
        .and_then(|v| v.get("Progress")?.get("Level")?.as_i64());
    let lo = lo.ok().flatten();
    let card_image = lo
        .as_ref()
        .and_then(|l| l.get("Identity"))
        .and_then(|i| st(i, "PlayerCardID"))
        .and_then(|c| a.cards.get(&c.to_lowercase()).cloned());
    let weapons = lo
        .as_ref()
        .map(|l| weapons_from_guns(a, l))
        .unwrap_or_default();

    if e.name.is_none() && e.current.is_none() && level.is_none() {
        return Err(CoreError::Api);
    }
    Ok(Player {
        puuid: me_id,
        name: e.name.clone(),
        hidden: false,
        is_self: true,
        team: String::new(),
        level,
        agent_name: None,
        agent_portrait: None,
        card_image,
        kd: e.kd,
        current: e.current,
        peak: e.peak,
        weapons,
    })
}

// ----------------------------------------------------------------------- maç

async fn find_match(sess: &Session) -> R<Option<(String, bool)>> {
    let glz = sess.glz()?;
    if let Some(v) = sess
        .get(&format!("{glz}/core-game/v1/players/{}", sess.puuid))
        .await?
    {
        if let Some(id) = st(&v, "MatchID") {
            return Ok(Some((id, false)));
        }
    }
    if let Some(v) = sess
        .get(&format!("{glz}/pregame/v1/players/{}", sess.puuid))
        .await?
    {
        if let Some(id) = st(&v, "MatchID") {
            return Ok(Some((id, true)));
        }
    }
    Ok(None)
}

async fn build_core(sess: &Session, a: &Assets, id: &str) -> R<MatchInfo> {
    let glz = sess.glz()?;
    let details = sess
        .get(&format!("{glz}/core-game/v1/matches/{id}"))
        .await?
        .ok_or(CoreError::Api)?;
    let loads = sess
        .get(&format!("{glz}/core-game/v1/matches/{id}/loadouts"))
        .await
        .ok()
        .flatten();
    let items = loads.as_ref().map(loadout_map).unwrap_or_default();

    let raw: Vec<&Value> = details
        .get("Players")
        .and_then(|p| p.as_array())
        .map(|p| p.iter().collect())
        .unwrap_or_default();
    let ids: Vec<String> = raw
        .iter()
        .filter_map(|p| st(p, "Subject"))
        .map(|x| x.to_lowercase())
        .collect();
    let en = enrich(sess, a, &ids).await;

    let mut players = Vec::new();
    for p in raw {
        let Some(sub) = st(p, "Subject").map(|x| x.to_lowercase()) else {
            continue;
        };
        let e = en.get(&sub).cloned().unwrap_or_default();
        let identity = p.get("PlayerIdentity").cloned().unwrap_or(Value::Null);
        let weapons = items
            .get(&sub)
            .map(|it| weapons_from_items(a, it))
            .unwrap_or_default();
        players.push(build_player(
            a,
            &e,
            &sub,
            &sess.puuid,
            st(p, "TeamID").unwrap_or_default(),
            st(p, "CharacterID"),
            &identity,
            weapons,
        ));
    }

    let (map_name, map_image) = map_info(a, &st(&details, "MapID").unwrap_or_default());
    let queue = details
        .get("MatchmakingData")
        .and_then(|m| st(m, "QueueID"))
        .or_else(|| st(&details, "QueueID"))
        .unwrap_or_default();
    Ok(MatchInfo {
        id: id.to_string(),
        map_name,
        map_image,
        mode_name: mode_name(&queue),
        players,
    })
}

async fn build_pregame(sess: &Session, a: &Assets, id: &str) -> R<MatchInfo> {
    let glz = sess.glz()?;
    let details = sess
        .get(&format!("{glz}/pregame/v1/matches/{id}"))
        .await?
        .ok_or(CoreError::Api)?;
    let ally = details.get("AllyTeam").cloned().unwrap_or(Value::Null);
    let team = st(&ally, "TeamID").unwrap_or_default();
    let raw: Vec<&Value> = ally
        .get("Players")
        .and_then(|p| p.as_array())
        .map(|p| p.iter().collect())
        .unwrap_or_default();
    let ids: Vec<String> = raw
        .iter()
        .filter_map(|p| st(p, "Subject"))
        .map(|x| x.to_lowercase())
        .collect();
    let en = enrich(sess, a, &ids).await;
    // Bu uç her sürümde olmayabilir; yoksa envanter boş kalır.
    let loads = sess
        .get(&format!("{glz}/pregame/v1/matches/{id}/loadouts"))
        .await
        .ok()
        .flatten();
    let items = loads.as_ref().map(loadout_map).unwrap_or_default();

    let mut players = Vec::new();
    for p in raw {
        let Some(sub) = st(p, "Subject").map(|x| x.to_lowercase()) else {
            continue;
        };
        let e = en.get(&sub).cloned().unwrap_or_default();
        let identity = p.get("PlayerIdentity").cloned().unwrap_or(Value::Null);
        let weapons = items
            .get(&sub)
            .map(|it| weapons_from_items(a, it))
            .unwrap_or_default();
        players.push(build_player(
            a,
            &e,
            &sub,
            &sess.puuid,
            team.clone(),
            st(p, "CharacterID"),
            &identity,
            weapons,
        ));
    }

    let (map_name, map_image) = map_info(a, &st(&details, "MapID").unwrap_or_default());
    let queue = st(&details, "QueueID").unwrap_or_default();
    Ok(MatchInfo {
        id: id.to_string(),
        map_name,
        map_image,
        mode_name: mode_name(&queue),
        players,
    })
}

// ------------------------------------------------------------------ snapshot

async fn build_snapshot() -> Snapshot {
    let mut snap = Snapshot {
        phase: Phase::Closed,
        status: Status::default(),
        me: None,
        current_match: None,
    };
    let Ok(sess) = Session::connect().await else {
        return snap;
    };
    snap.status.riot_client = true;
    snap.status.valorant = sess.valorant;
    let Ok(a) = assets().await else {
        return snap;
    };

    if let Ok(me) = build_me(&sess, &a).await {
        snap.me = Some(me);
        snap.status.data = true;
    }
    if !sess.valorant {
        return snap;
    }
    snap.phase = Phase::Waiting;

    match find_match(&sess).await {
        Ok(Some((id, pregame))) => {
            snap.status.data = true;
            let built = if pregame {
                build_pregame(&sess, &a, &id).await
            } else {
                build_core(&sess, &a, &id).await
            };
            if let Ok(m) = built {
                snap.phase = if pregame {
                    Phase::AgentSelect
                } else {
                    Phase::InMatch
                };
                snap.current_match = Some(m);
            }
        }
        Ok(None) => snap.status.data = true,
        Err(_) => {}
    }
    snap
}

pub async fn get_snapshot() -> Result<Snapshot, String> {
    let _guard = SNAP_LOCK.lock().await;
    if let Some((t, s)) = SNAP.lock().ok().and_then(|g| g.clone()) {
        if t.elapsed() < Duration::from_secs(3) {
            return Ok(s);
        }
    }
    let snap = build_snapshot().await;
    if let Ok(mut g) = SNAP.lock() {
        *g = Some((Instant::now(), snap.clone()));
    }
    Ok(snap)
}

// ---------------------------------------------------------------- istatistik

async fn match_row(sess: &Session, a: &Assets, me: &str, u: &Value) -> Option<MatchRow> {
    let id = st(u, "MatchID")?;
    let details = get_details(sess, &id).await.ok().flatten()?;
    let player = find_player(&details, me)?;
    let stats = player.get("stats")?;
    let rounds = int(stats, "roundsPlayed").unwrap_or(0).max(1);
    let score = int(stats, "score").unwrap_or(0);
    let team = st(player, "teamId").unwrap_or_default();
    let character = st(player, "characterId");
    let agent = character
        .as_ref()
        .and_then(|c| a.agents.get(&c.to_lowercase()));

    let teams = details.get("teams").and_then(|t| t.as_array());
    let mine = teams.and_then(|ts| {
        ts.iter()
            .find(|t| st(t, "teamId").as_deref() == Some(team.as_str()))
    });
    let won = match mine.and_then(|t| t.get("won").and_then(|w| w.as_bool())) {
        Some(true) => Some(true),
        Some(false) => {
            let other = teams
                .map(|ts| {
                    ts.iter()
                        .any(|t| t.get("won").and_then(|w| w.as_bool()) == Some(true))
                })
                .unwrap_or(false);
            if other {
                Some(false)
            } else {
                None
            }
        }
        None => None,
    };

    let map_id = details
        .get("matchInfo")
        .and_then(|m| st(m, "mapId"))
        .or_else(|| st(u, "MapID"))
        .unwrap_or_default();
    let (map_name, _) = map_info(a, &map_id);

    Some(MatchRow {
        match_id: id,
        started_at: int(u, "MatchStartTime").unwrap_or(0),
        map_name,
        agent_name: agent.map(|x| x.name.clone()),
        agent_portrait: agent.and_then(|x| x.portrait.clone()),
        won,
        kills: int(stats, "kills").unwrap_or(0),
        deaths: int(stats, "deaths").unwrap_or(0),
        assists: int(stats, "assists").unwrap_or(0),
        acs: round2(score as f64 / rounds as f64),
        rr_change: int(u, "RankedRatingEarned"),
    })
}

async fn my_stats_inner() -> R<MyStats> {
    let sess = Session::connect().await?;
    let a = assets().await?;
    let me = sess.puuid.to_lowercase();
    let updates = comp_updates(&sess, &me, 10).await?;
    let en = enrich(&sess, &a, std::slice::from_ref(&me)).await;
    let e = en.get(&me).cloned().unwrap_or_default();

    let sess_ref = &sess;
    let a_ref: &Assets = &a;
    let me_ref = me.as_str();
    let mut rows: Vec<MatchRow> = stream::iter(updates)
        .map(move |u| async move { match_row(sess_ref, a_ref, me_ref, &u).await })
        .buffer_unordered(4)
        .filter_map(|x| async move { x })
        .collect()
        .await;
    rows.sort_by(|x, y| y.started_at.cmp(&x.started_at));

    let (mut wins, mut losses) = (0u32, 0u32);
    let (mut kills, mut deaths) = (0i64, 0i64);
    let mut acs_sum = 0f64;
    for r in &rows {
        match r.won {
            Some(true) => wins += 1,
            Some(false) => losses += 1,
            None => {}
        }
        kills += r.kills;
        deaths += r.deaths;
        acs_sum += r.acs;
    }
    let decided = wins + losses;
    Ok(MyStats {
        current: e.current,
        peak: e.peak,
        win_rate: if decided > 0 {
            Some(round2(wins as f64 * 100.0 / decided as f64))
        } else {
            None
        },
        kd: if rows.is_empty() {
            None
        } else {
            Some(round2(kills as f64 / deaths.max(1) as f64))
        },
        avg_acs: if rows.is_empty() {
            None
        } else {
            Some(round2(acs_sum / rows.len() as f64))
        },
        matches: rows,
    })
}

pub async fn get_my_stats() -> Result<MyStats, String> {
    my_stats_inner()
        .await
        .map_err(|e| e.message().to_string())
}

// -------------------------------------------------------------------- mağaza

fn cost_of(v: Option<&Value>) -> i64 {
    let Some(v) = v else { return 0 };
    v.get(VP_ID)
        .and_then(|x| x.as_i64())
        .or_else(|| {
            v.as_object()
                .and_then(|m| m.values().next())
                .and_then(|x| x.as_i64())
        })
        .unwrap_or(0)
}

fn offer_from(a: &Assets, id: String, item: Option<String>, price: i64) -> Offer {
    let level = item.as_ref().and_then(|i| a.levels.get(&i.to_lowercase()));
    Offer {
        id,
        name: level
            .map(|l| l.name.clone())
            .unwrap_or_else(|| "Bilinmeyen ürün".to_string()),
        icon: level.and_then(|l| l.icon.clone()),
        price,
        original_price: None,
        discount_percent: None,
    }
}

async fn store_inner() -> R<Store> {
    let sess = Session::connect().await?;
    let a = assets().await?;
    let pd = sess.pd()?;
    let wallet_url = format!("{pd}/store/v1/wallet/{}", sess.puuid);
    let store_url = format!("{pd}/store/v3/storefront/{}", sess.puuid);
    let body = json!({});
    let (w, sv) = tokio::join!(
        sess.get(&wallet_url),
        sess.send_json(Method::POST, &store_url, &body)
    );
    let w = w?.ok_or(CoreError::Api)?;
    let sv = sv?.ok_or(CoreError::Api)?;

    let bal = |id: &str| {
        w.get("Balances")
            .and_then(|b| b.get(id))
            .and_then(|x| x.as_i64())
            .unwrap_or(0)
    };
    let wallet = Wallet {
        vp: bal(VP_ID),
        radianite: bal(RADIANITE_ID),
        kingdom: bal(KINGDOM_ID),
    };

    let now = now_ms();
    let panel = sv.get("SkinsPanelLayout").cloned().unwrap_or(Value::Null);
    let daily_offers: Vec<Offer> = panel
        .get("SingleItemStoreOffers")
        .and_then(|o| o.as_array())
        .into_iter()
        .flatten()
        .map(|o| {
            let item = o
                .get("Rewards")
                .and_then(|r| r.get(0))
                .and_then(|r| st(r, "ItemID"));
            offer_from(
                &a,
                st(o, "OfferID").unwrap_or_default(),
                item,
                cost_of(o.get("Cost")),
            )
        })
        .collect();
    let daily = OfferList {
        offers: daily_offers,
        expires_at: now + int(&panel, "SingleItemOffersRemainingDurationInSeconds").unwrap_or(0) * 1000,
    };

    let night_market = sv
        .get("BonusStore")
        .filter(|b| b.is_object())
        .and_then(|b| {
            let offers: Vec<Offer> = b
                .get("BonusStoreOffers")
                .and_then(|o| o.as_array())
                .into_iter()
                .flatten()
                .map(|o| {
                    let inner = o.get("Offer").unwrap_or(o);
                    let item = inner
                        .get("Rewards")
                        .and_then(|r| r.get(0))
                        .and_then(|r| st(r, "ItemID"));
                    let original = cost_of(inner.get("Cost"));
                    let price = cost_of(o.get("DiscountCosts"));
                    let mut offer = offer_from(
                        &a,
                        st(inner, "OfferID").unwrap_or_default(),
                        item,
                        price,
                    );
                    offer.original_price = Some(original);
                    offer.discount_percent = int(o, "DiscountPercent");
                    offer
                })
                .collect();
            if offers.is_empty() {
                return None;
            }
            Some(OfferList {
                offers,
                expires_at: now
                    + int(b, "BonusStoreRemainingDurationInSeconds").unwrap_or(0) * 1000,
            })
        });

    Ok(Store {
        wallet,
        daily,
        night_market,
    })
}

pub async fn get_store() -> Result<Store, String> {
    store_inner().await.map_err(|e| e.message().to_string())
}

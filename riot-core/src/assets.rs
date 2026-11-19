use futures::try_join;
use serde_json::Value;
use std::collections::HashMap;

pub struct Agent {
    pub name: String,
    pub portrait: Option<String>,
}

pub struct MapAsset {
    pub name: String,
    pub image: Option<String>,
}

pub struct Tier {
    pub name: String,
    pub icon: Option<String>,
}

pub struct Weapon {
    pub name: String,
    pub icon: Option<String>,
}

/// Ana kaplama (skin UUID'si ile bulunur).
pub struct Skin {
    pub name: String,
    pub icon: Option<String>,
    pub weapon: String,
    pub is_default: bool,
}

/// Kaplama seviyesi (seviye soketindeki UUID).
pub struct Level {
    pub name: String,
    pub icon: Option<String>,
    pub weapon: String,
    pub skin: String,
    pub is_default: bool,
}

/// Renk varyantı. `render` asıl görseldir (fullRender).
pub struct Chroma {
    pub render: Option<String>,
    pub skin: String,
}

/// valorant-api.com varlık sözlüğü (tr-TR). Anahtarlar küçük harf UUID'dir.
pub struct Assets {
    pub agents: HashMap<String, Agent>,
    pub maps: HashMap<String, MapAsset>,
    pub cards: HashMap<String, String>,
    pub tiers: HashMap<i32, Tier>,
    pub weapons: HashMap<String, Weapon>,
    pub weapon_order: Vec<String>,
    pub skins: HashMap<String, Skin>,
    pub levels: HashMap<String, Level>,
    pub chromas: HashMap<String, Chroma>,
}

pub fn st(v: &Value, key: &str) -> Option<String> {
    v.get(key)
        .and_then(|x| x.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

async fn fetch(http: &reqwest::Client, path: &str) -> Result<Vec<Value>, String> {
    let sep = if path.contains('?') { '&' } else { '?' };
    let url = format!("https://valorant-api.com/v1/{path}{sep}language=tr-TR");
    let resp = http
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .error_for_status()
        .map_err(|e| e.to_string())?;
    let v: Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok(v.get("data")
        .and_then(|d| d.as_array())
        .cloned()
        .unwrap_or_default())
}

impl Assets {
    pub async fn load(http: &reqwest::Client) -> Result<Assets, String> {
        let (agents, maps, cards, tiers, weapons) = try_join!(
            fetch(http, "agents?isPlayableCharacter=true"),
            fetch(http, "maps"),
            fetch(http, "playercards"),
            fetch(http, "competitivetiers"),
            fetch(http, "weapons"),
        )?;

        let mut a = Assets {
            agents: HashMap::new(),
            maps: HashMap::new(),
            cards: HashMap::new(),
            tiers: HashMap::new(),
            weapons: HashMap::new(),
            weapon_order: Vec::new(),
            skins: HashMap::new(),
            levels: HashMap::new(),
            chromas: HashMap::new(),
        };

        for v in &agents {
            if let Some(id) = st(v, "uuid") {
                a.agents.insert(
                    id.to_lowercase(),
                    Agent {
                        name: st(v, "displayName").unwrap_or_default(),
                        portrait: st(v, "fullPortrait").or_else(|| st(v, "displayIcon")),
                    },
                );
            }
        }

        for v in &maps {
            if let Some(url) = st(v, "mapUrl") {
                a.maps.insert(
                    url.to_lowercase(),
                    MapAsset {
                        name: st(v, "displayName").unwrap_or_default(),
                        image: st(v, "splash").or_else(|| st(v, "displayIcon")),
                    },
                );
            }
        }

        for v in &cards {
            if let Some(id) = st(v, "uuid") {
                if let Some(img) = st(v, "largeArt").or_else(|| st(v, "displayIcon")) {
                    a.cards.insert(id.to_lowercase(), img);
                }
            }
        }

        // Son kayıt güncel sezonun kademeleridir.
        if let Some(last) = tiers.last() {
            if let Some(list) = last.get("tiers").and_then(|t| t.as_array()) {
                for t in list {
                    if let Some(n) = t.get("tier").and_then(|x| x.as_i64()) {
                        a.tiers.insert(
                            n as i32,
                            Tier {
                                name: st(t, "tierName").unwrap_or_default(),
                                icon: st(t, "smallIcon"),
                            },
                        );
                    }
                }
            }
        }

        for w in &weapons {
            let Some(wid) = st(w, "uuid").map(|s| s.to_lowercase()) else {
                continue;
            };
            let default_skin = st(w, "defaultSkinUuid")
                .map(|s| s.to_lowercase())
                .unwrap_or_default();
            a.weapons.insert(
                wid.clone(),
                Weapon {
                    name: st(w, "displayName").unwrap_or_default(),
                    icon: st(w, "displayIcon"),
                },
            );
            a.weapon_order.push(wid.clone());

            let skins = w.get("skins").and_then(|s| s.as_array());
            for skin in skins.into_iter().flatten() {
                let skin_id = st(skin, "uuid").map(|s| s.to_lowercase()).unwrap_or_default();
                let skin_name = st(skin, "displayName").unwrap_or_default();
                let lower = skin_name.to_lowercase();
                let is_default = (!skin_id.is_empty() && skin_id == default_skin)
                    || lower.starts_with("standart")
                    || lower.starts_with("standard");
                let chromas = skin.get("chromas").and_then(|c| c.as_array());
                let skin_icon = st(skin, "displayIcon").or_else(|| {
                    chromas
                        .into_iter()
                        .flatten()
                        .find_map(|c| st(c, "fullRender"))
                });

                if !skin_id.is_empty() {
                    a.skins.insert(
                        skin_id.clone(),
                        Skin {
                            name: skin_name.clone(),
                            icon: skin_icon.clone(),
                            weapon: wid.clone(),
                            is_default,
                        },
                    );
                }

                let levels = skin.get("levels").and_then(|l| l.as_array());
                for lv in levels.into_iter().flatten() {
                    if let Some(lid) = st(lv, "uuid") {
                        a.levels.insert(
                            lid.to_lowercase(),
                            Level {
                                name: skin_name.clone(),
                                icon: st(lv, "displayIcon").or_else(|| skin_icon.clone()),
                                weapon: wid.clone(),
                                skin: skin_id.clone(),
                                is_default,
                            },
                        );
                    }
                }

                for c in chromas.into_iter().flatten() {
                    if let Some(cid) = st(c, "uuid") {
                        a.chromas.insert(
                            cid.to_lowercase(),
                            Chroma {
                                render: st(c, "fullRender")
                                    .or_else(|| st(c, "displayIcon"))
                                    .or_else(|| skin_icon.clone()),
                                skin: skin_id.clone(),
                            },
                        );
                    }
                }
            }
        }

        if a.tiers.is_empty() || a.weapons.is_empty() {
            return Err("varlık sözlüğü boş".to_string());
        }
        Ok(a)
    }
}

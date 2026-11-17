use reqwest::Method;
use serde_json::Value;
use std::sync::{Mutex, OnceLock};
use std::time::Duration;

const CLIENT_PLATFORM: &str = "ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CoreError {
    RiotClosed,
    NotLoggedIn,
    NoRegion,
    Network,
    Api,
}

impl CoreError {
    pub fn message(&self) -> &'static str {
        match self {
            CoreError::RiotClosed => "Riot Client kapalı. Önce Riot Client'ı açın.",
            CoreError::NotLoggedIn => "Riot hesabına giriş yapılmamış.",
            CoreError::NoRegion => "Bölge bilgisi alınamadı. Valorant'ı bir kez açın.",
            CoreError::Network => "Bağlantı kurulamadı. Biraz sonra tekrar deneyin.",
            CoreError::Api => "Veri alınamadı. Biraz sonra tekrar deneyin.",
        }
    }
}

pub type R<T> = Result<T, CoreError>;

static REMOTE: OnceLock<reqwest::Client> = OnceLock::new();
static LOCAL: OnceLock<reqwest::Client> = OnceLock::new();
static REGION: Mutex<Option<(String, String)>> = Mutex::new(None);
static VERSION: Mutex<Option<String>> = Mutex::new(None);

/// Dış (pvp.net / valorant-api.com) istekleri için ortak istemci.
pub fn remote_client() -> &'static reqwest::Client {
    REMOTE.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(12))
            .build()
            .expect("http istemcisi")
    })
}

// Riot Client yerel API'si kendinden imzalı sertifika kullanır; yalnızca 127.0.0.1 için.
fn local_client() -> &'static reqwest::Client {
    LOCAL.get_or_init(|| {
        reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .timeout(Duration::from_secs(4))
            .build()
            .expect("yerel http istemcisi")
    })
}

fn read_lockfile() -> Option<(u16, String)> {
    let base = std::env::var("LOCALAPPDATA").ok()?;
    let path = std::path::Path::new(&base)
        .join("Riot Games")
        .join("Riot Client")
        .join("Config")
        .join("lockfile");
    let text = std::fs::read_to_string(path).ok()?;
    let parts: Vec<&str> = text.trim().split(':').collect();
    if parts.len() < 5 {
        return None;
    }
    let port = parts[2].parse::<u16>().ok()?;
    Some((port, parts[3].to_string()))
}

async fn local_get(port: u16, password: &str, path: &str) -> R<Value> {
    let url = format!("https://127.0.0.1:{port}{path}");
    let resp = local_client()
        .get(url)
        .basic_auth("riot", Some(password))
        .send()
        .await
        .map_err(|_| CoreError::RiotClosed)?;
    if !resp.status().is_success() {
        return Err(CoreError::NotLoggedIn);
    }
    resp.json::<Value>().await.map_err(|_| CoreError::Api)
}

fn shard_for(region: &str) -> String {
    match region {
        "latam" | "br" => "na".to_string(),
        other => other.to_string(),
    }
}

/// ShooterGame.log içindeki son "glz-<bölge>-<n>.<shard>.a.pvp.net" kaydından bölgeyi okur.
fn region_from_log() -> Option<(String, String)> {
    let base = std::env::var("LOCALAPPDATA").ok()?;
    let path = std::path::Path::new(&base)
        .join("VALORANT")
        .join("Saved")
        .join("Logs")
        .join("ShooterGame.log");
    let bytes = std::fs::read(path).ok()?;
    let text = String::from_utf8_lossy(&bytes);
    let idx = text.rfind("https://glz-")?;
    let rest = &text[idx + "https://glz-".len()..];
    let dash = rest.find('-')?;
    let region = &rest[..dash];
    let after = &rest[dash + 1..];
    let dot = after.find('.')?;
    let tail = &after[dot + 1..];
    let end = tail.find('.')?;
    let shard = &tail[..end];
    if region.is_empty() || shard.is_empty() {
        return None;
    }
    Some((region.to_string(), shard.to_string()))
}

fn region_from_args(sessions: &Value) -> Option<String> {
    let map = sessions.as_object()?;
    for s in map.values() {
        if s.get("productId").and_then(|p| p.as_str()) != Some("valorant") {
            continue;
        }
        let args = s
            .get("launchConfiguration")
            .and_then(|l| l.get("arguments"))
            .and_then(|a| a.as_array())?;
        for a in args {
            if let Some(r) = a.as_str().and_then(|s| s.strip_prefix("-ares-deployment=")) {
                return Some(r.to_string());
            }
        }
    }
    None
}

fn valorant_running(sessions: &Value) -> bool {
    sessions
        .as_object()
        .map(|m| {
            m.values()
                .any(|s| s.get("productId").and_then(|p| p.as_str()) == Some("valorant"))
        })
        .unwrap_or(false)
}

async fn client_version() -> R<String> {
    if let Some(v) = VERSION.lock().ok().and_then(|g| g.clone()) {
        return Ok(v);
    }
    let v: Value = remote_client()
        .get("https://valorant-api.com/v1/version")
        .send()
        .await
        .map_err(|_| CoreError::Network)?
        .json()
        .await
        .map_err(|_| CoreError::Api)?;
    let ver = v
        .get("data")
        .and_then(|d| d.get("riotClientVersion"))
        .and_then(|s| s.as_str())
        .ok_or(CoreError::Api)?
        .to_string();
    if let Ok(mut g) = VERSION.lock() {
        *g = Some(ver.clone());
    }
    Ok(ver)
}

pub struct Session {
    pub puuid: String,
    pub valorant: bool,
    access_token: String,
    entitlement: String,
    version: String,
    region: Option<(String, String)>,
}

impl Session {
    /// Riot Client yerel API'sine bağlanır ve oturum belirteçlerini alır.
    pub async fn connect() -> R<Session> {
        let (port, password) = read_lockfile().ok_or(CoreError::RiotClosed)?;
        let tok = local_get(port, &password, "/entitlements/v1/token").await?;
        let access_token = tok
            .get("accessToken")
            .and_then(|s| s.as_str())
            .ok_or(CoreError::NotLoggedIn)?
            .to_string();
        let entitlement = tok
            .get("token")
            .and_then(|s| s.as_str())
            .ok_or(CoreError::NotLoggedIn)?
            .to_string();
        let puuid = tok
            .get("subject")
            .and_then(|s| s.as_str())
            .ok_or(CoreError::NotLoggedIn)?
            .to_string();

        let sessions = local_get(port, &password, "/product-session/v1/external-sessions")
            .await
            .unwrap_or(Value::Null);
        let valorant = valorant_running(&sessions);

        let region = match region_from_args(&sessions) {
            Some(r) => {
                let pair = (r.clone(), shard_for(&r));
                if let Ok(mut g) = REGION.lock() {
                    *g = Some(pair.clone());
                }
                Some(pair)
            }
            None => REGION
                .lock()
                .ok()
                .and_then(|g| g.clone())
                .or_else(|| {
                    let found = region_from_log();
                    if let (Some(p), Ok(mut g)) = (found.clone(), REGION.lock()) {
                        *g = Some(p);
                    }
                    found
                }),
        };

        let version = client_version().await?;

        Ok(Session {
            puuid,
            valorant,
            access_token,
            entitlement,
            version,
            region,
        })
    }

    pub fn pd(&self) -> R<String> {
        let (_, shard) = self.region.as_ref().ok_or(CoreError::NoRegion)?;
        Ok(format!("https://pd.{shard}.a.pvp.net"))
    }

    pub fn glz(&self) -> R<String> {
        let (region, shard) = self.region.as_ref().ok_or(CoreError::NoRegion)?;
        Ok(format!("https://glz-{region}-1.{shard}.a.pvp.net"))
    }

    fn builder(&self, method: Method, url: &str) -> reqwest::RequestBuilder {
        remote_client()
            .request(method, url)
            .bearer_auth(&self.access_token)
            .header("X-Riot-Entitlements-JWT", &self.entitlement)
            .header("X-Riot-ClientPlatform", CLIENT_PLATFORM)
            .header("X-Riot-ClientVersion", &self.version)
    }

    async fn finish(req: reqwest::RequestBuilder) -> R<Option<Value>> {
        let resp = req.send().await.map_err(|_| CoreError::Network)?;
        let status = resp.status();
        if status.as_u16() == 404 {
            return Ok(None);
        }
        if !status.is_success() {
            return Err(CoreError::Api);
        }
        resp.json::<Value>()
            .await
            .map(Some)
            .map_err(|_| CoreError::Api)
    }

    /// 404 → Ok(None). Diğer hatalar Err.
    pub async fn get(&self, url: &str) -> R<Option<Value>> {
        Self::finish(self.builder(Method::GET, url)).await
    }

    pub async fn send_json(&self, method: Method, url: &str, body: &Value) -> R<Option<Value>> {
        Self::finish(self.builder(method, url).json(body)).await
    }
}

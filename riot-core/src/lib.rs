//! VTracker için Riot yerel API ve pvp.net istemcisi.
//! Dışarıya yalnızca üç giriş noktası açılır: anlık görüntü, mağaza ve kendi istatistiklerim.

mod api;
mod assets;
mod client;
pub mod model;

pub use api::{get_my_stats, get_snapshot, get_store};

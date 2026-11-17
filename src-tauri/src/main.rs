#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use std::time::{Duration, Instant};

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, LogicalSize, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_global_shortcut::ShortcutState;

static LAST_PRESS: Mutex<Option<Instant>> = Mutex::new(None);
const REPEAT_GUARD: Duration = Duration::from_millis(400);

#[tauri::command]
async fn get_snapshot() -> Result<riot_core::model::Snapshot, String> {
    riot_core::get_snapshot().await
}

#[tauri::command]
async fn get_store() -> Result<riot_core::model::Store, String> {
    riot_core::get_store().await
}

#[tauri::command]
async fn get_my_stats() -> Result<riot_core::model::MyStats, String> {
    riot_core::get_my_stats().await
}

fn show_interactive(window: &WebviewWindow) {
    let _ = window.set_size(LogicalSize::new(1080.0, 680.0));
    let _ = window.set_ignore_cursor_events(false);
    let _ = window.show();
    let _ = window.set_focus();
}

fn toggle_overlay(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
    } else {
        show_interactive(&window);
    }
}

/// Basılı tutma tekrarlarını yok sayar: son olaydan 400 ms geçmeden gelen basışlar sayılmaz.
fn is_repeat() -> bool {
    let now = Instant::now();
    let mut last = LAST_PRESS.lock().unwrap_or_else(|e| e.into_inner());
    let repeat = last.map(|t| now.duration_since(t) < REPEAT_GUARD).unwrap_or(false);
    *last = Some(now);
    repeat
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(["F2"])
                .expect("F2 kısayolu")
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed && !is_repeat() {
                        toggle_overlay(app);
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            get_store,
            get_my_stats
        ])
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Çıkış", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            let mut tray = TrayIconBuilder::new()
                .tooltip("VTracker")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_overlay(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;

            if let Some(window) = app.get_webview_window("main") {
                show_interactive(&window);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Sistem kapatma isteği gizler; X düğmesi bu yolu kullanmaz, süreci kapatır.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("VTracker başlatılamadı");
}

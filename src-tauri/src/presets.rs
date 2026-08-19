use crate::errors::{DropCutError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// A preset is a named size target and nothing else.
///
/// Resolution, frame rate, audio bitrate and encoder used to live here, and
/// that was the bug: every one of them competed with the size target the app
/// promises to hit. They are derived from the target now — see `quality`.
/// Unknown fields in an older presets.json are simply ignored on load.
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipPreset {
    pub id: String,
    pub label: String,
    pub target_mi_b: f64,
    #[serde(default = "default_true")]
    pub visible: bool,
    #[serde(default)]
    pub description: String,
}

fn default_true() -> bool {
    true
}

impl ClipPreset {
    pub fn normalized(mut self) -> Self {
        self.target_mi_b = self.target_mi_b.clamp(1.0, 20_000.0);
        if self.label.trim().is_empty() {
            self.label = format!("{} MB", self.target_mi_b.round() as u64);
        }
        self
    }
}

pub fn default_presets() -> Vec<ClipPreset> {
    [
        ("discord-free", "10 MB", 10.0, "Discord Free"),
        ("discord-free-20", "20 MB", 20.0, "Discord Free"),
        ("discord-nitro", "50 MB", 50.0, "Nitro Basic"),
        ("discord-nitro-max", "500 MB", 500.0, "Nitro"),
    ]
    .into_iter()
    .map(|(id, label, target_mi_b, description)| ClipPreset {
        id: id.to_string(),
        label: label.to_string(),
        target_mi_b,
        visible: true,
        description: description.to_string(),
    })
    .collect()
}

pub fn config_dir_from_env() -> PathBuf {
    std::env::var_os("APPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("com.dropcut.desktop")
}

pub fn get_presets_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| config_dir_from_env())
        .join("presets.json")
}

pub fn get_presets_path_headless() -> PathBuf {
    config_dir_from_env().join("presets.json")
}

pub fn load_presets_from_path(path: PathBuf) -> Vec<ClipPreset> {
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(presets) = serde_json::from_str::<Vec<ClipPreset>>(&content) {
            if !presets.is_empty() {
                return presets.into_iter().map(ClipPreset::normalized).collect();
            }
        }
    }
    default_presets()
}

pub fn load_presets(app_handle: &tauri::AppHandle) -> Vec<ClipPreset> {
    load_presets_from_path(get_presets_path(app_handle))
}

pub fn load_presets_headless() -> Vec<ClipPreset> {
    load_presets_from_path(get_presets_path_headless())
}

pub fn save_presets_to_path(path: PathBuf, presets: Vec<ClipPreset>) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| DropCutError::Message(e.to_string()))?;
    }
    let presets: Vec<ClipPreset> = presets.into_iter().map(ClipPreset::normalized).collect();
    let content =
        serde_json::to_string_pretty(&presets).map_err(|e| DropCutError::Message(e.to_string()))?;
    fs::write(path, content).map_err(|e| DropCutError::Message(e.to_string()))?;
    Ok(())
}

pub fn save_presets(app_handle: &tauri::AppHandle, presets: Vec<ClipPreset>) -> Result<()> {
    save_presets_to_path(get_presets_path(app_handle), presets)
}

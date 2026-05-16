use crate::errors::{DropCutError, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClipPreset {
    pub id: String,
    pub label: String,
    pub target_mi_b: f64,
    pub visible: bool,
    pub description: String,
    pub output_format: String,
    pub speed_quality: u8,
    pub max_resolution: u32,
    pub max_fps: u32,
    pub audio_kbps: i32,
    pub default_encoder: String,
}

impl ClipPreset {
    pub fn normalized(mut self) -> Self {
        self.target_mi_b = self.target_mi_b.max(1.0);
        self.speed_quality = self.speed_quality.min(100);
        self.max_resolution = self.max_resolution.clamp(240, 2160);
        self.max_fps = self.max_fps.clamp(12, 120);
        self.audio_kbps = self.audio_kbps.clamp(0, 320);
        if self.output_format.is_empty() {
            self.output_format = "original".to_string();
        }
        if self.default_encoder.is_empty() {
            self.default_encoder = "auto".to_string();
        }
        self
    }
}

pub fn default_presets() -> Vec<ClipPreset> {
    vec![
        ClipPreset {
            id: "discord-free".to_string(),
            label: "10 MB".to_string(),
            target_mi_b: 9.75,
            visible: true,
            description: "Discord Free".to_string(),
            output_format: "original".to_string(),
            speed_quality: 72,
            max_resolution: 720,
            max_fps: 30,
            audio_kbps: 48,
            default_encoder: "cpu_quality".to_string(),
        },
        ClipPreset {
            id: "discord-nitro".to_string(),
            label: "50 MB".to_string(),
            target_mi_b: 48.0,
            visible: true,
            description: "Discord Nitro".to_string(),
            output_format: "original".to_string(),
            speed_quality: 62,
            max_resolution: 1080,
            max_fps: 60,
            audio_kbps: 96,
            default_encoder: "auto".to_string(),
        },
    ]
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

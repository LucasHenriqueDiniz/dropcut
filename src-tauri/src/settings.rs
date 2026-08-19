use crate::errors::Result;
use crate::presets::config_dir_from_env;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default)]
pub struct AppSettings {
    pub default_encoder: String,
    pub default_output: String,
    pub default_format: String,
    pub keep_audio_default: bool,
    pub default_preset_id: String,
    pub auto_open_output_folder: bool,
    pub output_filename_template: String,
    pub timeline_thumbnail_count: u8,
    pub locale: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_encoder: "auto".to_string(),
            default_output: "same_folder".to_string(),
            default_format: "original".to_string(),
            keep_audio_default: true,
            default_preset_id: "discord-free".to_string(),
            auto_open_output_folder: false,
            output_filename_template: "{target}mb_{name}".to_string(),
            timeline_thumbnail_count: 12,
            locale: "en".to_string(),
        }
    }
}

pub fn get_settings_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| config_dir_from_env())
        .join("settings.json")
}

pub fn get_settings_path_headless() -> PathBuf {
    config_dir_from_env().join("settings.json")
}

pub fn load_settings_from_path(path: PathBuf) -> AppSettings {
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(settings) = serde_json::from_str::<AppSettings>(&content) {
            return settings;
        }
    }
    AppSettings::default()
}

pub fn load_settings(app_handle: &tauri::AppHandle) -> AppSettings {
    load_settings_from_path(get_settings_path(app_handle))
}

pub fn load_settings_headless() -> AppSettings {
    load_settings_from_path(get_settings_path_headless())
}

pub fn save_settings(app_handle: &tauri::AppHandle, settings: AppSettings) -> Result<()> {
    let path = get_settings_path(app_handle);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| crate::errors::DropCutError::Message(e.to_string()))?;
    }
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| crate::errors::DropCutError::Message(e.to_string()))?;
    fs::write(path, content).map_err(|e| crate::errors::DropCutError::Message(e.to_string()))?;
    Ok(())
}

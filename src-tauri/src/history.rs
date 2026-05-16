use crate::errors::{DropCutError, Result};
use crate::presets::config_dir_from_env;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

const HISTORY_LIMIT: usize = 15;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: String,
    pub created_at: String,
    pub input_path: String,
    pub output_path: String,
    pub input_size_bytes: u64,
    pub output_size_bytes: u64,
    pub compression_ratio: f64,
    pub duration_seconds: f64,
}

pub struct RecordHistoryInput {
    pub input_path: String,
    pub output_path: String,
    pub duration_seconds: f64,
}

fn now_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

fn history_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| config_dir_from_env())
        .join("history.json")
}

fn load_history_from_path(path: &Path) -> Vec<HistoryEntry> {
    let Ok(content) = fs::read_to_string(path) else {
        return Vec::new();
    };

    serde_json::from_str::<Vec<HistoryEntry>>(&content).unwrap_or_default()
}

fn save_history_to_path(path: &Path, entries: &[HistoryEntry]) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| DropCutError::Message(e.to_string()))?;
    }
    let content =
        serde_json::to_string_pretty(entries).map_err(|e| DropCutError::Message(e.to_string()))?;
    fs::write(path, content).map_err(|e| DropCutError::Message(e.to_string()))?;
    Ok(())
}

fn prune_entries(entries: Vec<HistoryEntry>) -> Vec<HistoryEntry> {
    entries
        .into_iter()
        .filter(|entry| Path::new(&entry.output_path).is_file())
        .take(HISTORY_LIMIT)
        .collect()
}

pub fn load_history(app_handle: &tauri::AppHandle) -> Result<Vec<HistoryEntry>> {
    let path = history_path(app_handle);
    let entries = prune_entries(load_history_from_path(&path));
    save_history_to_path(&path, &entries)?;
    Ok(entries)
}

pub fn clear_history(app_handle: &tauri::AppHandle) -> Result<()> {
    let path = history_path(app_handle);
    if path.exists() {
        fs::remove_file(path).map_err(|e| DropCutError::Message(e.to_string()))?;
    }
    Ok(())
}

pub fn record_success(app_handle: &tauri::AppHandle, input: RecordHistoryInput) -> Result<()> {
    let input_meta = fs::metadata(&input.input_path)
        .map_err(|e| DropCutError::Message(format!("Failed to read input metadata: {e}")))?;
    let output_meta = fs::metadata(&input.output_path)
        .map_err(|e| DropCutError::Message(format!("Failed to read output metadata: {e}")))?;
    let input_size_bytes = input_meta.len();
    let output_size_bytes = output_meta.len();
    let compression_ratio = if input_size_bytes == 0 {
        0.0
    } else {
        1.0 - (output_size_bytes as f64 / input_size_bytes as f64)
    };

    let entry = HistoryEntry {
        id: format!("history-{}", now_millis()),
        created_at: chrono::Utc::now().to_rfc3339(),
        input_path: input.input_path,
        output_path: input.output_path,
        input_size_bytes,
        output_size_bytes,
        compression_ratio,
        duration_seconds: input.duration_seconds.max(0.0),
    };

    let path = history_path(app_handle);
    let mut entries = load_history_from_path(&path);
    entries.insert(0, entry);
    let entries = prune_entries(entries);
    save_history_to_path(&path, &entries)
}

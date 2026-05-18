use crate::context_menu;
use crate::ffmpeg;
use crate::headless::{BackgroundArgs, BackgroundState};
use crate::history::HistoryEntry;
use crate::log_util::emit_log;
use crate::presets::{self, ClipPreset};
use crate::settings::{self, AppSettings};
use crate::video_encode::{self, EncodeRequest};
use crate::video_probe::{self, VideoMetadata};
use std::path::Path;
use std::process::Command;
use std::{env, fs};
use tauri::{AppHandle, State};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
pub struct FfmpegStatus {
    pub ffmpeg_found: bool,
    pub ffmpeg_path: Option<String>,
    pub ffprobe_found: bool,
    pub ffprobe_path: Option<String>,
    pub encoders: Vec<String>,
}

#[tauri::command]
pub fn get_ffmpeg_status() -> FfmpegStatus {
    let ffmpeg_path = ffmpeg::resolve_ffmpeg_path();
    let ffprobe_path = ffmpeg::resolve_ffprobe_path();
    let encoders = ffmpeg::detect_available_encoders();

    FfmpegStatus {
        ffmpeg_found: ffmpeg_path.is_some(),
        ffmpeg_path: ffmpeg_path.map(|p| p.to_string_lossy().to_string()),
        ffprobe_found: ffprobe_path.is_some(),
        ffprobe_path: ffprobe_path.map(|p| p.to_string_lossy().to_string()),
        encoders,
    }
}

#[tauri::command]
pub fn generate_video_thumbnails(
    app: AppHandle,
    input_path: String,
    duration_seconds: f64,
    thumbnail_count: Option<u8>,
) -> Result<Vec<String>, String> {
    emit_log(
        &app,
        "INFO",
        &format!("Generating thumbnails for: {}", input_path),
    );

    let ffmpeg = ffmpeg::resolve_ffmpeg_path().ok_or("FFmpeg not found".to_string())?;
    let run_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let out_dir = std::env::temp_dir()
        .join("dropcut-thumbnails")
        .join(run_id.to_string());

    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

    let count = usize::from(thumbnail_count.unwrap_or(18).clamp(6, 24));
    let mut thumbnails = Vec::with_capacity(count);

    for index in 0..count {
        let time = if duration_seconds > 0.2 {
            ((duration_seconds / count as f64) * index as f64).min(duration_seconds - 0.1)
        } else {
            0.0
        };
        let out_path = out_dir.join(format!("thumb_{index:02}.jpg"));

        let mut command = Command::new(&ffmpeg);
        command
            .arg("-hide_banner")
            .arg("-loglevel")
            .arg("error")
            .arg("-y")
            .arg("-ss")
            .arg(format!("{time:.3}"))
            .arg("-i")
            .arg(&input_path)
            .arg("-frames:v")
            .arg("1")
            .arg("-vf")
            .arg("scale=160:90:force_original_aspect_ratio=increase,crop=160:90")
            .arg(&out_path);

        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        let output = command.output().map_err(|e| e.to_string())?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            emit_log(&app, "ERROR", &format!("Thumbnail failed: {}", err));
            continue;
        }

        if out_path.exists() {
            thumbnails.push(out_path.to_string_lossy().to_string());
        }
    }

    Ok(thumbnails)
}

#[tauri::command]
pub async fn probe_video(app: AppHandle, input_path: String) -> Result<VideoMetadata, String> {
    emit_log(&app, "INFO", &format!("Probing video: {}", input_path));
    video_probe::probe_video(&input_path).await.map_err(|e| {
        emit_log(&app, "ERROR", &format!("Probe failed: {}", e));
        e.to_string()
    })
}

#[tauri::command]
pub fn detect_available_encoders(app: AppHandle) -> Vec<String> {
    emit_log(&app, "INFO", "Detecting available encoders...");
    let encoders = ffmpeg::detect_available_encoders();
    emit_log(&app, "INFO", &format!("Found {} encoders", encoders.len()));
    encoders
}

#[tauri::command]
pub async fn start_encode(app: AppHandle, request: EncodeRequest) -> Result<String, String> {
    emit_log(
        &app,
        "INFO",
        &format!("Starting encode for: {}", request.input_path),
    );
    let meta = video_probe::probe_video(&request.input_path)
        .await
        .map_err(|e| {
            emit_log(&app, "ERROR", &format!("Initial probe failed: {}", e));
            e.to_string()
        })?;
    video_encode::run_encode(app.clone(), request, meta).map_err(|e| {
        emit_log(&app, "ERROR", &format!("Encode failed to start: {}", e));
        e.to_string()
    })?;
    emit_log(&app, "INFO", "Encode process started in background.");
    Ok("Encoding started".to_string())
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    settings::load_settings(&app)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    settings::save_settings(&app, settings).map_err(|e| {
        emit_log(&app, "ERROR", &format!("Failed to save settings: {}", e));
        e.to_string()
    })
}

#[tauri::command]
pub fn load_presets(app: AppHandle) -> Vec<ClipPreset> {
    presets::load_presets(&app)
}

#[tauri::command]
pub fn save_presets(app: AppHandle, presets: Vec<ClipPreset>) -> Result<(), String> {
    presets::save_presets(&app, presets).map_err(|e| {
        emit_log(&app, "ERROR", &format!("Failed to save presets: {}", e));
        e.to_string()
    })
}

#[tauri::command]
pub fn install_context_menu(
    app: AppHandle,
    presets: Option<Vec<ClipPreset>>,
) -> Result<bool, String> {
    emit_log(&app, "INFO", "Installing context menu...");
    let presets = presets.unwrap_or_else(|| presets::load_presets(&app));
    context_menu::install_context_menu(&presets).map_err(|e| {
        emit_log(&app, "ERROR", &format!("Menu install failed: {}", e));
        e.to_string()
    })
}

#[tauri::command]
pub fn uninstall_context_menu(app: AppHandle) -> Result<bool, String> {
    emit_log(&app, "INFO", "Uninstalling context menu...");
    context_menu::uninstall_context_menu().map_err(|e| {
        emit_log(&app, "ERROR", &format!("Menu uninstall failed: {}", e));
        e.to_string()
    })
}

#[tauri::command]
pub fn is_context_menu_installed(_app: AppHandle) -> Result<bool, String> {
    context_menu::is_context_menu_installed().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_health(app: AppHandle) -> Result<serde_json::Value, String> {
    emit_log(&app, "INFO", "Performing health check...");

    let ffmpeg_path = ffmpeg::resolve_ffmpeg_path();
    let ffprobe_path = ffmpeg::resolve_ffprobe_path();

    Ok(serde_json::json!({
        "ffmpeg": {
            "found": ffmpeg_path.is_some(),
            "path": ffmpeg_path.map(|p| p.to_string_lossy().to_string()),
        },
        "ffprobe": {
            "found": ffprobe_path.is_some(),
            "path": ffprobe_path.map(|p| p.to_string_lossy().to_string()),
        },
    }))
}

#[tauri::command]
pub fn open_export_folder(output_path: String) -> Result<(), String> {
    let path = Path::new(&output_path);
    let folder = if path.is_dir() {
        path
    } else {
        path.parent().ok_or("Output path has no parent folder")?
    };

    if !folder.exists() || !folder.is_dir() {
        return Err("Output folder does not exist".to_string());
    }

    let mut command = Command::new("explorer.exe");
    command.arg(folder);

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_external_link(kind: String) -> Result<(), String> {
    let url = match kind.as_str() {
        "donate" => "https://lucashdo.com/donate?project=DropCut",
        "github" => "https://github.com/LucasHenriqueDiniz/dropcut",
        _ => return Err("Unsupported link target".to_string()),
    };

    let mut command = Command::new("cmd.exe");
    command.args(["/C", "start", "", url]);

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    command.spawn().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    let file_path = Path::new(&path);
    if !file_path.exists() || !file_path.is_file() {
        return Err("File does not exist".to_string());
    }
    fs::metadata(file_path)
        .map(|metadata| metadata.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_background_launch(background_launch: State<bool>) -> bool {
    *background_launch
}

#[tauri::command]
pub fn start_background_compress(
    app: AppHandle,
    background_args: State<BackgroundArgs>,
    background_state: State<BackgroundState>,
) -> Result<bool, String> {
    let args = background_args
        .0
        .lock()
        .map_err(|_| "Background launch state is unavailable".to_string())?
        .take()
        .ok_or("No background compression request is available".to_string())?;

    Ok(crate::headless::start_background_compress(
        app,
        args,
        &background_state,
    ))
}

#[tauri::command]
pub fn cancel_background_compress(
    background_state: State<BackgroundState>,
) -> Result<bool, String> {
    crate::headless::cancel_background_compress(&background_state).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_history(app: AppHandle) -> Result<Vec<HistoryEntry>, String> {
    crate::history::load_history(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_history(app: AppHandle) -> Result<(), String> {
    crate::history::clear_history(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn cleanup_user_data() -> Result<(), String> {
    let mut paths = Vec::new();

    if let Ok(appdata) = env::var("APPDATA") {
        paths.push(std::path::PathBuf::from(appdata).join("com.dropcut.desktop"));
    }
    if let Ok(localappdata) = env::var("LOCALAPPDATA") {
        paths.push(std::path::PathBuf::from(localappdata).join("com.dropcut.desktop"));
    }
    if let Ok(temp) = env::var("TEMP") {
        paths.push(std::path::PathBuf::from(temp).join("dropcut-thumbnails"));
    }

    for path in paths {
        if path.exists() {
            fs::remove_dir_all(&path).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

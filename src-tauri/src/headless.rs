use crate::errors::{DropCutError, Result};
use crate::presets::{self, ClipPreset};
use crate::settings;
use crate::video_encode::{self, EncodeControl, EncodeRequest};
use crate::video_probe;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::Mutex;
use std::time::Duration;
use tauri::AppHandle;

pub struct BackgroundArgs(pub Mutex<Option<Vec<String>>>);
pub struct BackgroundState {
    pub cancel_requested: Arc<AtomicBool>,
    pub child_pid: Arc<Mutex<Option<u32>>>,
    pub output_path: Arc<Mutex<Option<String>>>,
    pub running: Arc<AtomicBool>,
}

impl Default for BackgroundState {
    fn default() -> Self {
        Self {
            cancel_requested: Arc::new(AtomicBool::new(false)),
            child_pid: Arc::new(Mutex::new(None)),
            output_path: Arc::new(Mutex::new(None)),
            running: Arc::new(AtomicBool::new(false)),
        }
    }
}

pub fn start_background_compress(
    app: AppHandle,
    args: Vec<String>,
    state: &BackgroundState,
) -> bool {
    state.cancel_requested.store(false, Ordering::Relaxed);
    state.running.store(true, Ordering::Relaxed);
    if let Ok(mut child_pid) = state.child_pid.lock() {
        *child_pid = None;
    }

    let input_path = match arg_value(&args, "--input") {
        Some(value) => value,
        None => {
            video_encode::emit_encode_progress(
                &app,
                "Error: background compression failed: missing input path.",
                0.0,
            );
            state.running.store(false, Ordering::Relaxed);
            schedule_exit(app);
            return false;
        }
    };
    let preset_id = match arg_value(&args, "--preset-id") {
        Some(value) => value,
        None => {
            video_encode::emit_encode_progress(
                &app,
                "Error: background compression failed: missing preset.",
                0.0,
            );
            state.running.store(false, Ordering::Relaxed);
            schedule_exit(app);
            return false;
        }
    };

    video_encode::emit_encode_progress(&app, "Preparing export", 0.0);
    let control = EncodeControl {
        cancel_requested: Arc::clone(&state.cancel_requested),
        child_pid: Arc::clone(&state.child_pid),
    };
    let output_path = Arc::clone(&state.output_path);
    let running = Arc::clone(&state.running);

    std::thread::spawn(move || {
        if let Err(error) =
            run_background_compress(&app, &input_path, &preset_id, control, &output_path)
        {
            let message = error.to_string();
            if message.to_lowercase().contains("cancelled") {
                video_encode::emit_encode_progress(&app, "Cancelled by user", 0.0);
                let maybe_path = output_path.lock().ok().and_then(|value| value.clone());
                if let Some(path) = maybe_path {
                    let _ = fs::remove_file(path);
                }
            } else {
                video_encode::emit_encode_progress(&app, format!("Error: {}", message), 0.0);
            }
        }
        if let Ok(mut value) = output_path.lock() {
            *value = None;
        }
        running.store(false, Ordering::Relaxed);
        schedule_exit(app);
    });

    true
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn run_background_compress(
    app: &AppHandle,
    input_path: &str,
    preset_id: &str,
    control: EncodeControl,
    output_path_state: &Arc<Mutex<Option<String>>>,
) -> Result<String> {
    let input = Path::new(input_path);
    if !input.exists() || !input.is_file() {
        return Err(DropCutError::FileNotFound(input_path.to_string()));
    }

    let presets = presets::load_presets_headless();
    let preset = presets
        .iter()
        .find(|preset| preset.id == preset_id)
        .cloned()
        .or_else(|| presets.iter().find(|preset| preset.visible).cloned())
        .ok_or_else(|| DropCutError::Message("No preset available".to_string()))?;
    let settings = settings::load_settings_headless();

    let runtime = tokio::runtime::Runtime::new()
        .map_err(|e| DropCutError::Message(format!("Failed to create runtime: {e}")))?;
    let meta = runtime.block_on(video_probe::probe_video(input_path))?;

    let output_path =
        output_path_for_preset(input_path, &preset, &settings.output_filename_template)?;
    if let Ok(mut value) = output_path_state.lock() {
        *value = Some(output_path.clone());
    }
    let request = EncodeRequest {
        input_path: input_path.to_string(),
        output_path: Some(output_path),
        target: preset.target_mi_b.ceil() as u32,
        start_seconds: 0.0,
        end_seconds: meta.duration_seconds,
        format: preset.output_format,
        encoder: if preset.default_encoder == "auto" {
            settings.default_encoder
        } else {
            preset.default_encoder
        },
        keep_audio: settings.keep_audio_default,
        max_resolution: preset.max_resolution,
        max_fps: preset.max_fps,
        audio_kbps: preset.audio_kbps,
        speed_quality: preset.speed_quality,
    };

    video_encode::run_encode_blocking_with_control(app, request, meta, Some(control))
}

pub fn cancel_background_compress(state: &BackgroundState) -> Result<bool> {
    if !state.running.load(Ordering::Relaxed) {
        return Ok(false);
    }

    state.cancel_requested.store(true, Ordering::Relaxed);
    if let Ok(child_pid) = state.child_pid.lock() {
        if let Some(pid) = *child_pid {
            let mut command = Command::new("taskkill");
            command.args(["/PID", &pid.to_string(), "/T", "/F"]);

            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                const CREATE_NO_WINDOW: u32 = 0x08000000;
                command.creation_flags(CREATE_NO_WINDOW);
            }

            let _ = command.output();
        }
    }

    Ok(true)
}

fn output_path_for_preset(input_path: &str, preset: &ClipPreset, template: &str) -> Result<String> {
    let path = Path::new(input_path);
    let folder = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("video");
    let safe_template = if template.trim().is_empty() {
        "{target}mb_{name}"
    } else {
        template.trim()
    };
    let base = safe_template
        .replace("{target}", &format!("{}", preset.target_mi_b.ceil() as u32))
        .replace("{name}", stem);

    for index in 0..1000 {
        let name = if index == 0 {
            format!("{base}.mp4")
        } else {
            format!("{base}_{index}.mp4")
        };
        let candidate = folder.join(name);
        if !candidate.exists() {
            return Ok(candidate.to_string_lossy().to_string());
        }
    }

    Err(DropCutError::Message(
        "Could not create unique output path".to_string(),
    ))
}

fn schedule_exit(app: AppHandle) {
    std::thread::spawn(move || {
        std::thread::sleep(Duration::from_millis(1800));
        app.exit(0);
    });
}

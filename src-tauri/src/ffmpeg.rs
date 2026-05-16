use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const TARGET_TRIPLE: &str = "x86_64-pc-windows-msvc";

fn sidecar_name(name: &str) -> String {
    let name_no_ext = name.trim_end_matches(".exe");
    format!("{name_no_ext}-{TARGET_TRIPLE}.exe")
}

fn resolve_binary(name: &str) -> Option<PathBuf> {
    let sidecar_name = sidecar_name(name);

    // 1. Try the bundled Tauri sidecar next to the app executable.
    if let Ok(exe_path) = std::env::current_exe() {
        let exe_dir = exe_path.parent().unwrap_or_else(|| Path::new("."));

        let paths = [exe_dir.join(&sidecar_name), exe_dir.join(name)];

        for path in &paths {
            if path.exists() {
                return Some(path.clone());
            }
        }
    }

    // 2. Try dev paths used by Tauri's externalBin convention.
    let dev_paths = [
        PathBuf::from("src-tauri").join(&sidecar_name),
        PathBuf::from(&sidecar_name),
    ];

    for path in &dev_paths {
        if path.exists() {
            return Some(path.clone());
        }
    }

    // 3. System PATH as a developer fallback.
    std::env::var_os("PATH").and_then(|paths| {
        std::env::split_paths(&paths)
            .filter_map(|p| {
                let full_path = p.join(name);
                if full_path.exists() {
                    Some(full_path)
                } else {
                    None
                }
            })
            .next()
    })
}

pub fn resolve_ffmpeg_path() -> Option<PathBuf> {
    resolve_binary("ffmpeg.exe")
}

pub fn resolve_ffprobe_path() -> Option<PathBuf> {
    resolve_binary("ffprobe.exe")
}

pub fn detect_available_encoders() -> Vec<String> {
    let Some(ffmpeg) = resolve_ffmpeg_path() else {
        return vec![];
    };

    let mut command = Command::new(ffmpeg);
    command.arg("-encoders");

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command.output();
    if let Ok(out) = output {
        let s = String::from_utf8_lossy(&out.stdout);
        return s.lines().map(ToString::to_string).collect();
    }
    vec![]
}

pub struct EncodeParams {
    pub input_path: String,
    pub output_path: String,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub bitrate_kbps: i32,
    pub audio_kbps: i32,
    pub resolution: (u32, u32),
    pub encoder: String,
    pub max_fps: u32,
    pub speed_quality: u8,
}

fn x264_preset(speed_quality: u8) -> &'static str {
    match speed_quality {
        0..=25 => "veryfast",
        26..=55 => "fast",
        56..=80 => "medium",
        _ => "slow",
    }
}

fn nvenc_preset(speed_quality: u8) -> &'static str {
    match speed_quality {
        0..=35 => "p3",
        36..=75 => "p5",
        _ => "p6",
    }
}

pub fn build_encode_command(params: &EncodeParams) -> Vec<String> {
    let mut args = vec![
        "-y".to_string(),
        "-nostats".to_string(),
        "-progress".to_string(),
        "pipe:1".to_string(),
        "-ss".to_string(),
        params.start_seconds.to_string(),
        "-i".to_string(),
        params.input_path.clone(),
        "-t".to_string(),
        (params.end_seconds - params.start_seconds).to_string(),
        "-c:v".to_string(),
        params.encoder.clone(),
        "-preset".to_string(),
    ];

    if params.encoder == "libx264" {
        args.push(x264_preset(params.speed_quality).to_string());
    } else {
        args.push(nvenc_preset(params.speed_quality).to_string());
    }

    args.push("-b:v".to_string());
    args.push(format!("{}k", params.bitrate_kbps));

    args.push("-vf".to_string());
    args.push(format!(
        "scale={}:{}:force_original_aspect_ratio=decrease:force_divisible_by=2,fps={}",
        params.resolution.0,
        params.resolution.1,
        params.max_fps.clamp(12, 120)
    ));

    // Audio Settings
    if params.audio_kbps > 0 {
        args.push("-c:a".to_string());
        args.push("aac".to_string());
        args.push("-b:a".to_string());
        args.push(format!("{}k", params.audio_kbps));
    } else {
        args.push("-an".to_string());
    }

    args.push("-movflags".to_string());
    args.push("+faststart".to_string());
    args.push(params.output_path.clone());

    args
}

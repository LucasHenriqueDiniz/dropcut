use crate::errors::Result;
use crate::ffmpeg::{self, EncodeParams};
use crate::history::{self, RecordHistoryInput};
use crate::video_probe::VideoMetadata;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Deserialize)]
pub struct EncodeRequest {
    pub input_path: String,
    pub output_path: Option<String>,
    pub target: u32,
    pub start_seconds: f64,
    pub end_seconds: f64,
    pub format: String,
    pub encoder: String,
    pub keep_audio: bool,
    pub max_resolution: u32,
    pub max_fps: u32,
    pub audio_kbps: i32,
    pub speed_quality: u8,
}

#[derive(Debug, Serialize, Clone)]
pub struct EncodeProgress {
    pub status: String,
    pub progress: f32,
}

#[derive(Clone)]
pub struct EncodeControl {
    pub cancel_requested: Arc<AtomicBool>,
    pub child_pid: Arc<Mutex<Option<u32>>>,
}

struct EncodeJob {
    request: EncodeRequest,
    bitrate: i32,
    resolution: (u32, u32),
    encoder: String,
    audio_kbps: i32,
    output_path: String,
    control: Option<EncodeControl>,
}

pub fn emit_encode_progress(app: &AppHandle, status: impl Into<String>, progress: f32) {
    let _ = app.emit(
        "encode-progress",
        EncodeProgress {
            status: status.into(),
            progress,
        },
    );
}

pub fn calculate_bitrate(
    target_mib: f64,
    duration_seconds: f64,
    audio_kbps: i32,
    overhead_kbps: i32,
) -> i32 {
    let target_bytes = target_mib * 1024.0 * 1024.0;
    let total_kbps = ((target_bytes * 8.0 / duration_seconds) / 1000.0).floor() as i32;
    total_kbps - audio_kbps - overhead_kbps
}

fn even(value: u32) -> u32 {
    if value % 2 == 0 {
        value
    } else {
        value.saturating_sub(1)
    }
}

fn dimensions_for_format(format: &str, max_resolution: u32) -> (u32, u32) {
    let max_resolution = max_resolution.clamp(240, 2160);

    match format {
        "landscape" => (even(max_resolution * 16 / 9), even(max_resolution)),
        "vertical" => (even(max_resolution * 9 / 16), even(max_resolution)),
        _ => (even(max_resolution), even(max_resolution)),
    }
}

fn resolve_video_encoder(mode: &str) -> String {
    let encoders = ffmpeg::detect_available_encoders().join("\n");

    match mode {
        "gpu_fast" if encoders.contains("h264_nvenc") => "h264_nvenc".to_string(),
        "auto" if encoders.contains("h264_nvenc") => "h264_nvenc".to_string(),
        _ => "libx264".to_string(),
    }
}

fn get_unique_output_path(input_path: &str, prefix: &str) -> PathBuf {
    let path = Path::new(input_path);
    let folder = path.parent().unwrap_or_else(|| Path::new("."));
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");

    let mut counter = 1;
    loop {
        let filename = if counter == 1 {
            format!("{}_{}.mp4", prefix, stem)
        } else {
            format!("{}_{}_{}.mp4", prefix, stem, counter)
        };
        let full_path = folder.join(filename);
        if !full_path.exists() {
            return full_path;
        }
        counter += 1;
    }
}

pub fn run_encode(app: AppHandle, request: EncodeRequest, _meta: VideoMetadata) -> Result<()> {
    let target_mib = (request.target as f64 * 0.975).max(1.0);
    let audio_kbps = if request.keep_audio {
        request.audio_kbps.clamp(32, 192)
    } else {
        0
    };

    let duration = request.end_seconds - request.start_seconds;
    let mut bitrate = calculate_bitrate(target_mib, duration, audio_kbps, 64);

    // Fallback for long videos
    let mut resolution = dimensions_for_format(&request.format, request.max_resolution);
    let mut encoder = resolve_video_encoder(&request.encoder);

    if bitrate < 120 {
        // Too long: lower quality aggressively
        // We can't easily change the request.keep_audio here, but we can override bitrate/res
        bitrate = 120;
        resolution = (640, 360);
        encoder = "libx264".to_string();
    }

    let prefix = if request.target == 8 { "8mb" } else { "25mb" };
    let output_path = request
        .output_path
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| get_unique_output_path(&request.input_path, prefix));
    let output_str = output_path.to_string_lossy().to_string();

    // Start process in background thread
    thread::spawn(move || {
        if let Err(e) = execute_ffmpeg_pipeline(
            &app,
            EncodeJob {
                request,
                bitrate,
                resolution,
                encoder,
                audio_kbps,
                output_path: output_str,
                control: None,
            },
        ) {
            emit_encode_progress(&app, format!("Error: {}", e), 0.0);
        }
    });

    Ok(())
}

pub fn run_encode_blocking_with_control(
    app: &AppHandle,
    request: EncodeRequest,
    _meta: VideoMetadata,
    control: Option<EncodeControl>,
) -> Result<String> {
    let target_mib = (request.target as f64 * 0.975).max(1.0);
    let audio_kbps = if request.keep_audio {
        request.audio_kbps.clamp(32, 192)
    } else {
        0
    };

    let duration = request.end_seconds - request.start_seconds;
    let mut bitrate = calculate_bitrate(target_mib, duration, audio_kbps, 64);
    let mut resolution = dimensions_for_format(&request.format, request.max_resolution);
    let mut encoder = resolve_video_encoder(&request.encoder);

    if bitrate < 120 {
        bitrate = 120;
        resolution = (640, 360);
        encoder = "libx264".to_string();
    }

    let prefix = format!("{}mb", request.target);
    let output_path = request
        .output_path
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| get_unique_output_path(&request.input_path, &prefix));
    let output_str = output_path.to_string_lossy().to_string();

    execute_ffmpeg_pipeline(
        app,
        EncodeJob {
            request,
            bitrate,
            resolution,
            encoder,
            audio_kbps,
            output_path: output_str.clone(),
            control,
        },
    )?;
    Ok(output_str)
}

fn execute_ffmpeg_pipeline(app: &AppHandle, job: EncodeJob) -> Result<()> {
    let ffmpeg =
        ffmpeg::resolve_ffmpeg_path().ok_or(crate::errors::DropCutError::FfmpegNotFound)?;
    let request = job.request;
    let output_path = job.output_path;

    let two_pass = false;

    for pass in 1..=if two_pass { 2 } else { 1 } {
        let params = EncodeParams {
            input_path: request.input_path.clone(),
            output_path: output_path.clone(),
            start_seconds: request.start_seconds,
            end_seconds: request.end_seconds,
            bitrate_kbps: job.bitrate,
            audio_kbps: job.audio_kbps,
            resolution: job.resolution,
            encoder: job.encoder.clone(),
            max_fps: request.max_fps,
            speed_quality: request.speed_quality,
        };

        let args = ffmpeg::build_encode_command(&params);
        let status_text = if two_pass {
            if pass == 1 {
                "Pass 1/2 (Analyzing)"
            } else {
                "Pass 2/2 (Encoding)"
            }
        } else {
            "Encoding"
        };

        emit_encode_progress(app, status_text, 0.0);

        let mut command = Command::new(&ffmpeg);
        command
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        let mut child = command.spawn().map_err(|e| {
            crate::errors::DropCutError::Message(format!("Failed to spawn FFmpeg: {}", e))
        })?;

        if let Some(ctrl) = &job.control {
            if let Ok(mut child_pid) = ctrl.child_pid.lock() {
                *child_pid = Some(child.id());
            }
        }

        let stdout = child.stdout.take().ok_or_else(|| {
            crate::errors::DropCutError::Message("Failed to capture FFmpeg stdout".to_string())
        })?;
        let stderr = child.stderr.take().ok_or_else(|| {
            crate::errors::DropCutError::Message("Failed to capture FFmpeg stderr".to_string())
        })?;
        let full_stderr = Arc::new(Mutex::new(String::new()));
        let stderr_buffer = Arc::clone(&full_stderr);
        let stderr_thread = thread::spawn(move || {
            let mut reader = BufReader::new(stderr);
            let mut buffer = String::new();
            let _ = reader.read_to_string(&mut buffer);
            if let Ok(mut stderr) = stderr_buffer.lock() {
                *stderr = buffer;
            }
        });

        let reader = BufReader::new(stdout);
        let total_sec = (request.end_seconds - request.start_seconds).max(0.001);

        for line in reader.lines() {
            let line = line.unwrap_or_default();

            if let Some(ctrl) = &job.control {
                if ctrl.cancel_requested.load(Ordering::Relaxed) {
                    let _ = child.kill();
                    return Err(crate::errors::DropCutError::Message(
                        "Cancelled by user".to_string(),
                    ));
                }
            }

            if let Some(current_sec) = parse_ffmpeg_progress_seconds(&line) {
                let progress = (current_sec / total_sec * 100.0).clamp(0.0, 99.0) as f32;
                emit_encode_progress(app, status_text, progress);
            }
        }

        let status = child
            .wait()
            .map_err(|e| crate::errors::DropCutError::Message(format!("Wait failed: {}", e)))?;
        let _ = stderr_thread.join();

        if !status.success() {
            if let Some(ctrl) = &job.control {
                if ctrl.cancel_requested.load(Ordering::Relaxed) {
                    return Err(crate::errors::DropCutError::Message(
                        "Cancelled by user".to_string(),
                    ));
                }
            }
            let stderr = full_stderr
                .lock()
                .map(|value| value.clone())
                .unwrap_or_else(|_| "Failed to read FFmpeg stderr".to_string());
            return Err(crate::errors::DropCutError::Message(format!(
                "FFmpeg failed with exit code {}. Stderr: {}",
                status.code().unwrap_or(-1),
                stderr
            )));
        }
    }

    if let Some(ctrl) = &job.control {
        if let Ok(mut child_pid) = ctrl.child_pid.lock() {
            *child_pid = None;
        }
    }

    let duration_seconds = request.end_seconds - request.start_seconds;
    if let Err(error) = history::record_success(
        app,
        RecordHistoryInput {
            input_path: request.input_path,
            output_path: output_path.clone(),
            duration_seconds,
        },
    ) {
        log::warn!("Failed to record export history: {error}");
    }

    emit_encode_progress(app, format!("Done: {}", output_path), 100.0);
    Ok(())
}

fn parse_ffmpeg_progress_seconds(line: &str) -> Option<f64> {
    let (key, value) = line.split_once('=')?;
    match key {
        "out_time_us" | "out_time_ms" => value.parse::<f64>().ok().map(|time| time / 1_000_000.0),
        "out_time" => parse_hms_seconds(value),
        _ => None,
    }
}

fn parse_hms_seconds(value: &str) -> Option<f64> {
    let mut parts = value.split(':');
    let hours = parts.next()?.parse::<f64>().ok()?;
    let minutes = parts.next()?.parse::<f64>().ok()?;
    let seconds = parts.next()?.parse::<f64>().ok()?;
    Some(hours * 3600.0 + minutes * 60.0 + seconds)
}

#[cfg(test)]
mod tests {
    use super::parse_ffmpeg_progress_seconds;

    #[test]
    fn parses_ffmpeg_microsecond_progress() {
        assert_eq!(
            parse_ffmpeg_progress_seconds("out_time_us=2500000"),
            Some(2.5)
        );
    }

    #[test]
    fn parses_ffmpeg_hms_progress() {
        assert_eq!(
            parse_ffmpeg_progress_seconds("out_time=00:01:02.500000"),
            Some(62.5)
        );
    }
}

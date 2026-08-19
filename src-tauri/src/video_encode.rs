use crate::errors::Result;
use crate::ffmpeg::{self, EncodeParams};
use crate::history::{self, RecordHistoryInput};
use crate::quality::{self, EncoderHint, QualityPlan, SourceLimits};
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

/// Rate control is an average, so a complex clip can still land over the limit.
/// Measure and re-encode until it fits, but cap the passes — each one costs a
/// full encode, and past this point the correction is chasing noise.
const MAX_SIZE_PASSES: u32 = 3;
/// How far under the target a correction pass aims, so it does not need a third.
const RETRY_UNDERSHOOT: f64 = 0.96;
/// The first pass owns most of the bar; the rest is left for the size fix-ups so
/// progress never jumps backwards when a correction is needed.
const FIRST_PASS_PROGRESS_SPAN: f32 = 85.0;

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EncodeRequest {
    pub input_path: String,
    pub output_path: Option<String>,
    /// Nominal size limit in MiB (10, 20, 50, 500...). Everything else about the
    /// encode is derived from this — see `quality`.
    pub target: f64,
    pub start_seconds: f64,
    pub end_seconds: f64,
    /// Aspect handling: original / landscape / vertical. A content choice, not
    /// a quality knob, which is why it survives as an input.
    pub format: String,
    /// Whether the clip keeps its sound at all. The bitrate is never the user's
    /// to pick; it is whatever the size budget can spare.
    pub keep_audio: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct EncodeProgress {
    pub status: String,
    pub progress: f32,
    /// Which part of the job this is, so the UI can label it instead of
    /// guessing from the percentage. Empty when it does not apply.
    pub stage: String,
}

#[derive(Clone)]
pub struct EncodeControl {
    pub cancel_requested: Arc<AtomicBool>,
    pub child_pid: Arc<Mutex<Option<u32>>>,
}

struct EncodeJob {
    request: EncodeRequest,
    plan: QualityPlan,
    resolution: (u32, u32),
    encoder: String,
    output_path: String,
    /// Hard ceiling the finished file must respect, in bytes.
    target_bytes: u64,
    control: Option<EncodeControl>,
}

pub fn emit_encode_progress(app: &AppHandle, status: impl Into<String>, progress: f32) {
    emit_encode_stage(app, "", status, progress);
}

pub fn emit_encode_stage(
    app: &AppHandle,
    stage: impl Into<String>,
    status: impl Into<String>,
    progress: f32,
) {
    let _ = app.emit(
        "encode-progress",
        EncodeProgress {
            status: status.into(),
            progress,
            stage: stage.into(),
        },
    );
}

fn even(value: u32) -> u32 {
    if value % 2 == 0 {
        value
    } else {
        value.saturating_sub(1)
    }
}

/// Turns the planned frame height into a bounding box for the chosen aspect.
/// FFmpeg still letterboxes inside it, so the source ratio is never distorted.
fn dimensions_for_format(format: &str, height: u32) -> (u32, u32) {
    let height = height.clamp(144, 2160);

    match format {
        "landscape" => (even(height * 16 / 9), even(height)),
        "vertical" => (even(height * 9 / 16), even(height)),
        _ => (even(height), even(height)),
    }
}

fn resolve_video_encoder(hint: EncoderHint) -> String {
    if hint == EncoderHint::Gpu {
        let encoders = ffmpeg::detect_available_encoders().join("\n");
        if encoders.contains("h264_nvenc") {
            return "h264_nvenc".to_string();
        }
    }
    // NVENC needs far more bits than x264 to look the same, so a tight budget
    // always goes to the CPU even when a GPU is sitting right there.
    "libx264".to_string()
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

/// Turns a request into concrete encoder settings. Shared by the windowed and
/// the background (context menu) entry points so both honour the size limit
/// the same way.
fn plan_encode(
    request: &EncodeRequest,
    meta: &VideoMetadata,
    control: Option<EncodeControl>,
) -> EncodeJob {
    let target_mib = request.target.max(0.1);
    let duration = request.end_seconds - request.start_seconds;

    let source = SourceLimits {
        height: meta.height.max(144),
        fps: meta.fps.round().clamp(12.0, 120.0) as u32,
    };
    let plan = quality::plan_quality(target_mib, duration, request.keep_audio, source);

    let prefix = format!("{}mb", target_mib.round() as u64);
    let output_path = request
        .output_path
        .as_ref()
        .map(PathBuf::from)
        .unwrap_or_else(|| get_unique_output_path(&request.input_path, &prefix));

    EncodeJob {
        resolution: dimensions_for_format(&request.format, plan.height),
        encoder: resolve_video_encoder(plan.encoder_hint),
        plan,
        output_path: output_path.to_string_lossy().to_string(),
        target_bytes: (target_mib * 1024.0 * 1024.0) as u64,
        control,
        request: request.clone(),
    }
}

pub fn run_encode(app: AppHandle, request: EncodeRequest, meta: VideoMetadata) -> Result<()> {
    let job = plan_encode(&request, &meta, None);

    // Start process in background thread
    thread::spawn(move || {
        if let Err(e) = execute_ffmpeg_pipeline(&app, job) {
            emit_encode_progress(&app, format!("Error: {}", e), 0.0);
        }
    });

    Ok(())
}

pub fn run_encode_blocking_with_control(
    app: &AppHandle,
    request: EncodeRequest,
    meta: VideoMetadata,
    control: Option<EncodeControl>,
) -> Result<String> {
    let job = plan_encode(&request, &meta, control);
    let output_str = job.output_path.clone();

    execute_ffmpeg_pipeline(app, job)?;
    Ok(output_str)
}

/// The bitrate a correction pass should use, or `None` when the file already
/// fits or when the floor means another pass would produce the same file.
fn corrected_bitrate(current_kbps: i32, actual_bytes: u64, target_bytes: u64) -> Option<i32> {
    if actual_bytes <= target_bytes || actual_bytes == 0 {
        return None;
    }

    let ratio = target_bytes as f64 / actual_bytes as f64;
    let corrected = ((current_kbps as f64 * ratio * RETRY_UNDERSHOOT) as i32)
        .max(quality::MIN_VIDEO_BITRATE_KBPS);

    (corrected < current_kbps).then_some(corrected)
}

fn execute_ffmpeg_pipeline(app: &AppHandle, job: EncodeJob) -> Result<()> {
    let ffmpeg =
        ffmpeg::resolve_ffmpeg_path().ok_or(crate::errors::DropCutError::FfmpegNotFound)?;
    let request = job.request;
    let output_path = job.output_path;

    let mut params = EncodeParams {
        input_path: request.input_path.clone(),
        output_path: output_path.clone(),
        start_seconds: request.start_seconds,
        end_seconds: request.end_seconds,
        bitrate_kbps: job.plan.video_kbps,
        audio_kbps: job.plan.audio_kbps,
        audio_channels: job.plan.audio_channels,
        audio_sample_rate: job.plan.audio_sample_rate,
        resolution: job.resolution,
        encoder: job.encoder.clone(),
        max_fps: job.plan.fps,
        speed_quality: job.plan.speed_quality,
    };

    run_ffmpeg(
        app,
        &ffmpeg,
        &params,
        job.control.as_ref(),
        ProgressPhase {
            stage: "encoding",
            start: 0.0,
            span: FIRST_PASS_PROGRESS_SPAN,
        },
    )?;

    // Converge on the target instead of accepting whatever the first pass gave.
    let correction_span = (100.0 - FIRST_PASS_PROGRESS_SPAN) / (MAX_SIZE_PASSES - 1) as f32;
    for pass in 1..MAX_SIZE_PASSES {
        let Some(actual_bytes) = file_size(&output_path) else {
            break;
        };
        let Some(corrected) =
            corrected_bitrate(params.bitrate_kbps, actual_bytes, job.target_bytes)
        else {
            if actual_bytes > job.target_bytes {
                log::warn!(
                    "Output {actual_bytes} B exceeds target {} B but bitrate is already at the floor",
                    job.target_bytes
                );
            }
            break;
        };

        log::info!(
            "Pass {pass}: output {actual_bytes} B exceeded target {} B; re-encoding at {corrected} kbps",
            job.target_bytes
        );
        params.bitrate_kbps = corrected;
        run_ffmpeg(
            app,
            &ffmpeg,
            &params,
            job.control.as_ref(),
            ProgressPhase {
                stage: "adjusting",
                start: FIRST_PASS_PROGRESS_SPAN + correction_span * (pass - 1) as f32,
                span: correction_span,
            },
        )?;
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

fn file_size(path: &str) -> Option<u64> {
    std::fs::metadata(path).ok().map(|metadata| metadata.len())
}

/// Where one FFmpeg pass sits on the single, always-forward progress bar.
#[derive(Clone, Copy)]
struct ProgressPhase {
    stage: &'static str,
    start: f32,
    span: f32,
}

/// Runs one FFmpeg pass, streaming progress and honouring cancellation.
fn run_ffmpeg(
    app: &AppHandle,
    ffmpeg: &Path,
    params: &EncodeParams,
    control: Option<&EncodeControl>,
    phase: ProgressPhase,
) -> Result<()> {
    let args = ffmpeg::build_encode_command(params);

    emit_encode_stage(app, phase.stage, phase.stage, phase.start);

    let mut command = Command::new(ffmpeg);
    command
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command.spawn().map_err(|e| {
        crate::errors::DropCutError::Message(format!("Failed to spawn FFmpeg: {}", e))
    })?;

    if let Some(ctrl) = control {
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
    let total_sec = (params.end_seconds - params.start_seconds).max(0.001);

    for line in reader.lines() {
        let line = line.unwrap_or_default();

        if let Some(ctrl) = control {
            if ctrl.cancel_requested.load(Ordering::Relaxed) {
                let _ = child.kill();
                return Err(crate::errors::DropCutError::Message(
                    "Cancelled by user".to_string(),
                ));
            }
        }

        if let Some(current_sec) = parse_ffmpeg_progress_seconds(&line) {
            let ratio = (current_sec / total_sec).clamp(0.0, 1.0) as f32;
            emit_encode_stage(
                app,
                phase.stage,
                phase.stage,
                phase.start + ratio * phase.span,
            );
        }
    }

    let status = child
        .wait()
        .map_err(|e| crate::errors::DropCutError::Message(format!("Wait failed: {}", e)))?;
    let _ = stderr_thread.join();

    if !status.success() {
        if let Some(ctrl) = control {
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
    use super::*;

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

    #[test]
    fn a_file_that_fits_needs_no_correction() {
        assert_eq!(corrected_bitrate(1000, 900, 1000), None);
    }

    /// An oversized file must come back with a proportionally lower bitrate.
    #[test]
    fn an_oversized_file_gets_a_lower_bitrate() {
        let corrected = corrected_bitrate(1000, 2000, 1000).expect("should correct");
        assert!(corrected < 1000);
        assert!(corrected <= 500, "expected roughly half, got {corrected}");
    }

    /// Without this guard the app burns a second full encode to produce a file
    /// byte-identical to the first one.
    #[test]
    fn no_pointless_pass_when_already_at_the_floor() {
        assert_eq!(
            corrected_bitrate(quality::MIN_VIDEO_BITRATE_KBPS, 5_000, 1_000),
            None
        );
    }
}

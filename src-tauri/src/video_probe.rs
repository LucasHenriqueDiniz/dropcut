use crate::errors::{DropCutError, Result};
use crate::ffmpeg::resolve_ffprobe_path;
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::process::Command;
use tokio::time::{timeout, Duration};

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoMetadata {
    pub path: String,
    pub file_name: String,
    pub duration_seconds: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub size_bytes: u64,
    pub has_audio: bool,
    pub video_codec: Option<String>,
    pub audio_codec: Option<String>,
}

#[derive(Deserialize)]
struct ProbeResult {
    streams: Vec<ProbeStream>,
    format: ProbeFormat,
}

#[derive(Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    codec_name: Option<String>,
    width: Option<u32>,
    height: Option<u32>,
    r_frame_rate: Option<String>,
}

#[derive(Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
    size: Option<String>,
}

pub async fn probe_video(input_path: &str) -> Result<VideoMetadata> {
    if !Path::new(input_path).exists() {
        return Err(DropCutError::FileNotFound(input_path.to_string()));
    }

    let ffprobe = resolve_ffprobe_path().ok_or(DropCutError::FfprobeNotFound)?;

    let probe_fut = async {
        let mut command = Command::new(ffprobe);
        command
            .arg("-v")
            .arg("error")
            .arg("-analyzeduration")
            .arg("5M")
            .arg("-probesize")
            .arg("5M")
            .arg("-show_format")
            .arg("-show_streams")
            .arg("-print_format")
            .arg("json")
            .arg(input_path);

        #[cfg(windows)]
        command.creation_flags(CREATE_NO_WINDOW);

        let output = command
            .output()
            .await
            .map_err(|e| DropCutError::Message(e.to_string()))?;

        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            return Err(DropCutError::Message(format!("FFprobe failed: {}", err)));
        }

        Ok(output)
    };

    let output = timeout(Duration::from_secs(10), probe_fut)
        .await
        .map_err(|_| DropCutError::ProbeTimeout)??;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let parsed: ProbeResult = serde_json::from_str(&stdout).map_err(|_| {
        DropCutError::Message(format!(
            "Invalid video metadata. FFprobe output: {}",
            stdout
        ))
    })?;
    let video_stream = parsed
        .streams
        .iter()
        .find(|s| s.codec_type.as_deref() == Some("video"));
    let audio_stream = parsed
        .streams
        .iter()
        .find(|s| s.codec_type.as_deref() == Some("audio"));

    let duration_seconds = parsed
        .format
        .duration
        .and_then(|d| d.parse::<f64>().ok())
        .unwrap_or(0.0);
    let size_bytes = parsed
        .format
        .size
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0);
    let fps = video_stream
        .and_then(|s| s.r_frame_rate.clone())
        .and_then(|f| {
            let mut parts = f.split('/');
            let n = parts.next()?.parse::<f64>().ok()?;
            let d = parts.next()?.parse::<f64>().ok()?;
            Some(n / d)
        })
        .unwrap_or(0.0);

    let file_name = Path::new(input_path)
        .file_name()
        .and_then(|v| v.to_str())
        .unwrap_or_default()
        .to_string();

    Ok(VideoMetadata {
        path: input_path.to_string(),
        file_name,
        duration_seconds,
        width: video_stream.and_then(|s| s.width).unwrap_or(0),
        height: video_stream.and_then(|s| s.height).unwrap_or(0),
        fps,
        size_bytes,
        has_audio: audio_stream.is_some(),
        video_codec: video_stream.and_then(|s| s.codec_name.clone()),
        audio_codec: audio_stream.and_then(|s| s.codec_name.clone()),
    })
}

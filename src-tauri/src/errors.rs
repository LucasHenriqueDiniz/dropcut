use thiserror::Error;

#[derive(Debug, Error)]
pub enum DropCutError {
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("FFmpeg not found. Put ffmpeg-x86_64-pc-windows-msvc.exe in src-tauri or PATH")]
    FfmpegNotFound,
    #[error("FFprobe not found. Put ffprobe-x86_64-pc-windows-msvc.exe in src-tauri or PATH")]
    FfprobeNotFound,
    #[error("FFprobe analysis timed out")]
    ProbeTimeout,
    #[error("{0}")]
    Message(String),
}

pub type Result<T> = std::result::Result<T, DropCutError>;

export type VideoMetadata = {
  path: string;
  file_name: string;
  duration_seconds: number;
  width: number;
  height: number;
  fps: number;
  size_bytes: number;
  has_audio: boolean;
  video_codec: string | null;
  audio_codec: string | null;
};

export type ProgressStatus = string;

/// Everything the backend needs. Quality settings are absent on purpose: they
/// are derived from `target`, because any fixed value competes with it.
export type EncodeRequest = {
  inputPath: string;
  outputPath?: string;
  target: number;
  startSeconds: number;
  endSeconds: number;
  format: string;
  keepAudio: boolean;
};

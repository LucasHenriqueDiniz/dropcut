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

export type EncodeRequest = {
  input_path: string;
  output_path?: string;
  target: number;
  start_seconds: number;
  end_seconds: number;
  format: string;
  encoder: string;
  keep_audio: boolean;
  max_resolution: number;
  max_fps: number;
  audio_kbps: number;
  speed_quality: number;
};

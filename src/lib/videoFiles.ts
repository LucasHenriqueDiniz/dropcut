export const ACCEPTED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'webm', 'avi'] as const;

export const ACCEPTED_VIDEO_DESCRIPTION = ACCEPTED_VIDEO_EXTENSIONS.join(', ').toUpperCase();

export function isAcceptedVideoPath(path: string) {
  const fileName = path.split(/[\\/]/).pop() ?? path;
  const extension = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : undefined;

  return extension ? ACCEPTED_VIDEO_EXTENSIONS.includes(extension as (typeof ACCEPTED_VIDEO_EXTENSIONS)[number]) : false;
}

export function unsupportedVideoMessage() {
  return `Unsupported file. Drop a video (${ACCEPTED_VIDEO_DESCRIPTION}).`;
}

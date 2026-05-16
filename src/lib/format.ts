export const formatSeconds = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes)) return '-';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

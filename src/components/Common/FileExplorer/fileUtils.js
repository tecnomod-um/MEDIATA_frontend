export const getFileExtension = (fileName) => {
  const m = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : "";
};

export const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0)} ${units[i]}`;
};

export const formatDateTime = (ms) => {
  const t = Number(ms);
  if (!Number.isFinite(t) || t <= 0) return "—";
  return new Date(t).toLocaleString();
};

export const isFileNew = (file, thresholdMs = 60000) => {
  const created = Number(file.createdAtMs) || 0;
  if (!created) return false;
  return Date.now() - created < thresholdMs;
};

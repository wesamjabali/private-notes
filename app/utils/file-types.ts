export const CORE_TEXT_EXTS = [".md", ".txt"];

export const CODE_EXTS = [
  ".json",
  ".yml",
  ".yaml",
  ".xml",
  ".html",
  ".css",
  ".scss",
  ".js",
  ".ts",
  ".vue",
  ".gitignore",
  ".env",
];

export const TEXT_EXTS = [...CORE_TEXT_EXTS, ...CODE_EXTS];

export const IMAGE_EXTS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "svg",
];

export const VIDEO_EXTS = [
  "mp4",
  "webm",
  "mov",
  "avi",
  "mkv",
  "m4v",
  "ogv",
];

export const AUDIO_EXTS = ["mp3", "wav", "ogg", "m4a"];

export const PDF_EXTS = ["pdf"];

export const BINARY_EXTS = [
  ...IMAGE_EXTS,
  ...VIDEO_EXTS,
  ...AUDIO_EXTS,
  ...PDF_EXTS,
];

export const ALLOWED_EXTS = [
  ...CORE_TEXT_EXTS,
  ...IMAGE_EXTS.map((ext) => `.${ext}`),
  ...VIDEO_EXTS.map((ext) => `.${ext}`),
  ...AUDIO_EXTS.map((ext) => `.${ext}`),
  ...PDF_EXTS.map((ext) => `.${ext}`),
];

export function getFileExtension(filename: string): string {
  if (!filename.includes(".")) return "";
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

export function isBinary(filename: string): boolean {
  const ext = getFileExtension(filename).replace(".", "");
  return BINARY_EXTS.includes(ext);
}

export function isImage(filename: string): boolean {
  const ext = getFileExtension(filename).replace(".", "");
  return IMAGE_EXTS.includes(ext);
}

export function isVideo(filename: string): boolean {
  const ext = getFileExtension(filename).replace(".", "");
  return VIDEO_EXTS.includes(ext);
}

export function getFileType(
  filename: string
): "text" | "image" | "video" | "audio" | "pdf" | "unknown" {
  if (isImage(filename)) return "image";
  if (isVideo(filename)) return "video";
  
  const ext = getFileExtension(filename).replace(".", "");
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (PDF_EXTS.includes(ext)) return "pdf";
  

  
  
  if (isBinary(filename)) return "unknown"; 
  
  return "text";
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename).replace(".", "");
  if (isImage(filename)) return `image/${ext}`;
  if (isVideo(filename)) return `video/${ext}`;
  if (AUDIO_EXTS.includes(ext)) return `audio/${ext}`;
  if (PDF_EXTS.includes(ext)) return "application/pdf";
  return "text/plain";
}

export function detectPlatform(userAgent = "") {
  if (/android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  return "desktop";
}

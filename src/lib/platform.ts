import type { Platform } from "../types/story";

export function detectPlatform(userAgent = ""): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iPad|iPhone|iPod/.test(userAgent)) return "ios";
  return "desktop";
}

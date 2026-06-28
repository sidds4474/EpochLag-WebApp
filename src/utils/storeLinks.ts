import type { MouseEvent } from "react";

export const APP_STORE_URL = "https://apps.apple.com/us/app/epochlag/id6745345209";
export const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.epoch.epochlag";

export function getStoreUrl(): string | null {
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return PLAY_STORE_URL;
  if (/iPad|iPhone|iPod/.test(ua)) return APP_STORE_URL;
  return null;
}

export function handleStoreClick(e: MouseEvent<HTMLAnchorElement>): void {
  const url = getStoreUrl();
  if (url) {
    e.preventDefault();
    window.location.href = url;
  }
}

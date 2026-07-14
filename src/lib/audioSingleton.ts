// Module-level playback singleton — ensures only one audio source plays at
// a time across the app (e.g. music pill across two thread slides, or a
// future MediaViewer video). Any caller that starts playback must claim();
// the previous holder is paused. When a caller pauses or unmounts, it
// release()s so the slot is free.
//
// This is intentionally a plain module (not React context) so it works
// across sibling components without wrapping the whole tree in a provider.

let currentPlayer: HTMLAudioElement | null = null;

export function claimPlayback(audio: HTMLAudioElement): void {
  if (currentPlayer && currentPlayer !== audio) {
    try {
      currentPlayer.pause();
    } catch {
      // ignore — the previous element may already be detached
    }
  }
  currentPlayer = audio;
}

export function releasePlayback(audio: HTMLAudioElement): void {
  if (currentPlayer === audio) currentPlayer = null;
}

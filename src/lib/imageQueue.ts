// Global image-load concurrency limiter (QA #59). The media host returns 429
// ("too many requests") when a grid fires a dozen cover requests the instant it
// mounts — a different random set fails each refresh, while Google-hosted
// avatars on another host never fail. Retry-with-backoff (see
// `images.ts#retryImageOnError`) recovers individual failures, but the real
// client-side lever is not creating the burst in the first place: cap how many
// <img> loads are in flight at once and release a slot as each finishes.
//
// This is a best-effort smoother, not a fix for an aggressively low server
// limit — the durable fix is server-side (raise the limit / CDN the images).
//
// Used via the <QueuedImage> component, which also viewport-gates enqueue so an
// off-screen image never holds a slot it isn't actually loading.

const MAX_IN_FLIGHT = 6;

let inFlight = 0;
const waiting: Array<() => void> = [];

function pump(): void {
  while (inFlight < MAX_IN_FLIGHT && waiting.length > 0) {
    const job = waiting.shift();
    if (!job) break;
    inFlight += 1;
    job();
  }
}

// Queue a load. `start` is invoked (synchronously or later) once a slot frees;
// the caller must then call releaseImageSlot() exactly once when the image
// finishes loading, errors, or unmounts.
export function acquireImageSlot(start: () => void): void {
  waiting.push(start);
  pump();
}

// Remove a still-queued job that was never granted a slot (component unmounted
// or its src changed while waiting). No-op if it already started.
export function cancelImageSlot(start: () => void): void {
  const i = waiting.indexOf(start);
  if (i !== -1) waiting.splice(i, 1);
}

// Free a slot held by a granted job and let the next waiter proceed.
export function releaseImageSlot(): void {
  if (inFlight > 0) inFlight -= 1;
  pump();
}

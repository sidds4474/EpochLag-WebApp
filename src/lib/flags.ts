// Feature flags mirrored from mobile's config/flags.js. Keep names + values
// aligned so a flag flip is a one-line change across platforms.

// BE asked mobile to stop acting on docking-station `progressStatus` — the
// tracking isn't reliable yet, so no tile renders Done or disables based on
// it. Applies uniformly to `challenge` AND `hows-life` tile types. Flip to
// true once BE confirms the writes are trustworthy.
// Mobile source: config/flags.js:34 — DOCKING_PROGRESS_ENABLED = false.
export const DOCKING_PROGRESS_ENABLED = false;

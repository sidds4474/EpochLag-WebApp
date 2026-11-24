// `<dailyEntry>` marker — a BE-invisible tag injected at the start of a
// story's `content` field when the story is being published as a daily
// lag. Parsers on the read side (archive hook, LagViewer) scan for the
// marker to recognize dailies and extract the stored ISO date / theme.
// BE stores content verbatim and does NOT parse the marker — client is
// the only consumer.

export const DAILY_ENTRY_MARKER_REGEX =
  /<dailyEntry\s+((?:[a-zA-Z]+="[^"]*"\s*)+)\/>\s*/;

export type DailyEntryMeta = {
  date: string | null;
  theme: string | null;
};

/**
 * Prepend a `<dailyEntry date="…" [theme="…"]/>` tag to the content.
 * If the content already carries a marker (edit re-publish), the old
 * one is stripped first so there's never more than one.
 */
export function prependDailyEntryMarker(
  content: string,
  isoDate: string,
  theme: string | null = null,
): string {
  const stripped = content.replace(DAILY_ENTRY_MARKER_REGEX, "");
  const themeAttr = theme ? ` theme="${theme}"` : "";
  return `<dailyEntry date="${isoDate}"${themeAttr}/>\n${stripped}`;
}

/**
 * Extract the stored meta from a content string. Returns null if the
 * story isn't a daily (no marker present).
 */
export function extractDailyEntryMeta(content = ""): DailyEntryMeta | null {
  const match = content.match(DAILY_ENTRY_MARKER_REGEX);
  if (!match) return null;
  const attrs = match[1];
  return {
    date: attrs.match(/date="([^"]+)"/)?.[1] ?? null,
    theme: attrs.match(/theme="([^"]+)"/)?.[1] ?? null,
  };
}

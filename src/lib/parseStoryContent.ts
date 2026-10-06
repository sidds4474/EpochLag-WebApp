import type { ContentBlock } from "../types/story";

// Story content is a custom tagged format from the backend with four tag types:
//   <text>...</text>     paragraph
//   <image>URL</image>   inline body image
//   <video>URL</video>   inline body video
//   <audio>URL</audio>   inline body audio
//
// Backend also emits <audioTranscribe idRef="aud_...">text</audioTranscribe>
// as a sibling to the matching <audio> block. We don't render transcripts yet,
// so strip the whole tag — otherwise it leaks as stray untagged text.
//
// Legacy stories may send plain text with no tags at all — treat that as one
// text block. See the backend rendering brief for the full spec.

export function parseContentToBlocks(content = ""): ContentBlock[] {
  if (!content) return [];

  // Drop audioTranscribe blocks entirely (not rendered in v1).
  const stripped = content.replace(
    /<audioTranscribe\b[\s\S]*?<\/audioTranscribe\s*>/g,
    ""
  );

  // Strip optional attributes on tags: <video width="..." height="...">  →  <video>
  const normalized = stripped.replace(
    /<(image|video|audio|text)(\s[^>]*)>/g,
    "<$1>"
  );

  const blocks: ContentBlock[] = [];
  const tagRegex = /<(image|video|audio|text)>(.*?)<\/\1>/gs;
  let cursor = 0;
  let match;

  while ((match = tagRegex.exec(normalized)) !== null) {
    const [full, type, value] = match;
    const start = match.index;

    // Stray untagged text between/before tags (legacy mixed content)
    if (start > cursor) {
      const stray = normalized.slice(cursor, start);
      if (stray.trim()) blocks.push({ type: "text", text: stray });
    }

    if (type === "text") {
      blocks.push({ type: "text", text: value });
    } else {
      blocks.push({
        type: type as "image" | "video" | "audio",
        url: value.trim(),
      });
    }

    cursor = start + full.length;
  }

  // Trailing untagged text
  if (cursor < normalized.length) {
    const tail = normalized.slice(cursor);
    if (tail.trim()) blocks.push({ type: "text", text: tail.trimEnd() });
  }

  // Entirely untagged (legacy plain-text) story
  if (blocks.length === 0 && normalized.trim()) {
    blocks.push({ type: "text", text: normalized.trimEnd() });
  }

  return blocks;
}

export function hasInlineMediaBlocks(blocks: ContentBlock[]): boolean {
  return blocks.some(
    (b) => b.type === "image" || b.type === "video" || b.type === "audio"
  );
}

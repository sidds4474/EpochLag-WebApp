// Mirrors the mobile V4 serializer (helpers.js:165-186). See parseStoryContent.ts
// for the read-side parser — this format is a pseudo-XML tagged string.

export type StoryBlock =
  | { type: "text"; text: string }
  | { type: "image" | "video" | "audio"; url: string };

export function serializeBlocksToContent(blocks: StoryBlock[]): string {
  return blocks
    .map((block) => {
      if (block.type === "text") {
        const trimmed = (block.text || "").trimEnd();
        return trimmed ? `<text>${trimmed}</text>` : "";
      }
      const url = block.url || "";
      return url ? `<${block.type}>${url}</${block.type}>` : "";
    })
    .filter(Boolean)
    .join("\n");
}

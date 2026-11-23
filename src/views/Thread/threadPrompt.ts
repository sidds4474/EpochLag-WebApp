import type { ThreadResponse } from "../../types/home";

// Mobile parity: a "prompt" is only real content when the user has typed
// something. The placeholder `isTitleAvailable: true` row isn't a prompt.
// Shared by the prompt-viewer redirect and the lag-viewer "View more" gate so
// both surfaces agree on whether a thread is prompt-backed.
export function threadHasRealPrompt(data: ThreadResponse): boolean {
  const p = data.thread?.prompt;
  if (!p) return false;
  const hasBody = Boolean(
    (p.content && p.content.trim()) || p.imageUrl,
  );
  if (!hasBody) return false;
  return !p.isTitleAvailable;
}

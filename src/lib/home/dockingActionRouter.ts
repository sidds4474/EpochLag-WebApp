import type { DockingItem } from "./api";

export type InviteVariant = "reward" | "challenge";

export type DockingActionRoute =
  | { kind: "invite"; variant: InviteVariant; cardId: string; message?: string }
  | {
      kind: "prompt-detail";
      // The underlying user-card the recipient answers. Comes from
      // action.cardId — NOT item._id, because the docking-station card is a
      // wrapper around a real prompt user-card.
      promptId: string;
      // Original docking-station card id — needed later for POSTing progress
      // { status: "completed", promptCardId: <inner> } after the compose.
      challengeCardId: string;
      challengeType: "hows-life";
      mode: "curated";
    }
  | { kind: "fallback" };

// Docking-station tiles ship an opaque `action` payload. This mirrors the
// mobile router (dockingActionRouter.js:145-181). Kinds are the source of
// truth for what UI the tile opens.
//
// Note the `give-a-month-get-month` alias — BE has an inconsistent tile that
// drops the second "a" and we route both to the same reward variant.
export function resolveDockingAction(item: DockingItem): DockingActionRoute {
  const action = item.action;
  if (!action || typeof action !== "object") return { kind: "fallback" };
  const kind = typeof action.kind === "string" ? action.kind : "";

  const cardId = item._id;
  const message = item.message;

  switch (kind) {
    case "give-a-month-get-a-month":
    case "give-a-month-get-month":
      return { kind: "invite", variant: "reward", cardId, message };
    case "connect-with-3-friends":
    case "challenge_flow":
      return { kind: "invite", variant: "challenge", cardId, message };
    case "referral_flow": {
      // BE can override the default reward variant per tile via
      // action.variant. Unknown values fall back to reward.
      const variantOverride =
        typeof (action as Record<string, unknown>).variant === "string"
          ? ((action as Record<string, unknown>).variant as string)
          : "";
      const variant: InviteVariant =
        variantOverride === "challenge" ? "challenge" : "reward";
      return { kind: "invite", variant, cardId, message };
    }
    case "hows-life": {
      // The docking-station card is a wrapper — action.cardId points at the
      // underlying user-card prompt the user actually reads/answers. Without
      // both ids, the composer can't POST progress after publish.
      const innerCardId =
        typeof (action as Record<string, unknown>).cardId === "string"
          ? ((action as Record<string, unknown>).cardId as string)
          : "";
      if (!innerCardId) return { kind: "fallback" };
      return {
        kind: "prompt-detail",
        promptId: innerCardId,
        challengeCardId: cardId,
        challengeType: "hows-life",
        mode: "curated",
      };
    }
    default:
      return { kind: "fallback" };
  }
}

export function buildPromptDetailHref(route: {
  promptId: string;
  challengeCardId: string;
  challengeType: "hows-life";
  mode: "curated";
}): string {
  const params = new URLSearchParams({
    mode: route.mode,
    challengeType: route.challengeType,
    challengeCardId: route.challengeCardId,
  });
  return `/prompt/detail/${encodeURIComponent(route.promptId)}?${params.toString()}`;
}

export function buildInviteHref(route: {
  variant: InviteVariant;
  cardId: string;
  message?: string;
}): string {
  const params = new URLSearchParams({
    variant: route.variant,
    cardId: route.cardId,
  });
  if (route.message && route.message.trim()) {
    params.set("message", route.message.trim());
  }
  return `/invite?${params.toString()}`;
}

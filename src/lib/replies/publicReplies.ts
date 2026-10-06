import { api, ApiError } from "../api/client";

export type ReplyTargetType = "story" | "prompt";

export type ReplyErrorCode =
  | "LINK_NOT_FOUND"
  | "REPLY_NOT_ALLOWED"
  | "VERIFY_REQUIRED"
  | "LOGIN_REQUIRED"
  | "REPLY_ALREADY_SENT"
  | "REPLY_IN_PROGRESS"
  | "LINK_REVOKED"
  | "REPLY_MERGE_FAILED";

export type ReplyAuthor = {
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  isGuest: boolean;
};

export type ReplySubmitSuccess = {
  storyId: string;
  threadId: string;
  targetType: ReplyTargetType;
  publicCode: string;
  publicUrl: string;
  alreadySent: boolean;
  author: ReplyAuthor;
};

export type ReplyAs = {
  name: string;
  phone?: string;
  countryCode?: string;
  email?: string;
};

type OpenReplyEnvelope =
  | { draftToken: string }
  | { data: { draftToken: string }; success: boolean };

// POST /api/public/replies — mint a draftToken for this reply session.
// No auth: fully public.
export async function openReply(
  targetType: ReplyTargetType,
  code: string
): Promise<{ draftToken: string }> {
  // eslint-disable-next-line no-console
  console.log("[openReply] REQUEST →", {
    endpoint: "/api/public/replies",
    body: { targetType, code },
    timestamp: new Date().toISOString(),
  });

  try {
    const res = await api.post<OpenReplyEnvelope>(
      "/api/public/replies",
      { targetType, code },
      { auth: false }
    );
    // eslint-disable-next-line no-console
    console.log("[openReply] RESPONSE ←", { raw: res });

    const draftToken =
      "draftToken" in res
        ? res.draftToken
        : "data" in res
        ? res.data.draftToken
        : null;
    if (!draftToken) {
      // eslint-disable-next-line no-console
      console.error("[openReply] NO DRAFTTOKEN in response", res);
      throw new Error("Backend did not return draftToken");
    }
    // eslint-disable-next-line no-console
    console.log(
      "[openReply] draftToken minted:",
      draftToken.slice(0, 10) + "…"
    );
    return { draftToken };
  } catch (err) {
    if (err instanceof ApiError) {
      // eslint-disable-next-line no-console
      console.error("[openReply] FAILURE", {
        status: err.status,
        code: err.code,
        message: err.message,
        data: err.data,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error("[openReply] UNKNOWN FAILURE", err);
    }
    throw err;
  }
}

type SubmitEnvelope =
  | ReplySubmitSuccess
  | { data: ReplySubmitSuccess; success: boolean };

// POST /api/public/replies/submit
// Attaches Authorization: Bearer whenever a JWT is stored (Edge Case A —
// logged-in web user). skipAutoSignout so 401 VERIFY_REQUIRED is surfaced
// to the caller rather than triggering a global sign-out.
export async function submitReply(params: {
  draftToken: string;
  replyAs?: ReplyAs;
}): Promise<ReplySubmitSuccess> {
  const body: Record<string, unknown> = { draftToken: params.draftToken };
  if (params.replyAs) body.replyAs = params.replyAs;

  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  // eslint-disable-next-line no-console
  console.log("[submitReply] REQUEST →", {
    endpoint: "/api/public/replies/submit",
    body: {
      draftToken: params.draftToken?.slice(0, 10) + "…",
      replyAs: params.replyAs ?? "(none)",
    },
    headers: {
      Authorization:
        typeof window !== "undefined" &&
        window.localStorage.getItem("epochlag.token")
          ? "Bearer <stored jwt>"
          : "(none)",
    },
    timestamp: new Date().toISOString(),
  });

  try {
    const res = await api.post<SubmitEnvelope>(
      "/api/public/replies/submit",
      body,
      { skipAutoSignout: true }
    );

    const dt = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
    );
    // eslint-disable-next-line no-console
    console.log(`[submitReply] SUCCESS ← (${dt}ms)`, {
      raw: res,
      parsed: "data" in res && res.data ? res.data : res,
    });

    return "data" in res && res.data ? res.data : (res as ReplySubmitSuccess);
  } catch (err) {
    const dt = Math.round(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
    );
    if (err instanceof ApiError) {
      // eslint-disable-next-line no-console
      console.error(`[submitReply] FAILURE ← (${dt}ms)`, {
        status: err.status,
        code: err.code,
        message: err.message,
        data: err.data,
        name: err.name,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error(`[submitReply] UNKNOWN FAILURE ← (${dt}ms)`, {
        err,
        rawMessage: err instanceof Error ? err.message : String(err),
      });
    }
    throw err;
  }
}

export function isReplyErrorCode(code: unknown): code is ReplyErrorCode {
  return (
    typeof code === "string" &&
    (
      [
        "LINK_NOT_FOUND",
        "REPLY_NOT_ALLOWED",
        "VERIFY_REQUIRED",
        "LOGIN_REQUIRED",
        "REPLY_ALREADY_SENT",
        "REPLY_IN_PROGRESS",
        "LINK_REVOKED",
        "REPLY_MERGE_FAILED",
      ] as string[]
    ).includes(code)
  );
}

export function replyErrorCode(err: unknown): ReplyErrorCode | undefined {
  if (err instanceof ApiError && isReplyErrorCode(err.code)) return err.code;
  return undefined;
}

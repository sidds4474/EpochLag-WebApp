import type { ReplyTargetType, ReplyAs } from './publicReplies';

// Build the in-browser reply composer URL.
// These are the routes that slice 3 will implement.
export function replyComposerUrl(
  targetType: ReplyTargetType,
  code: string,
  replyAs?: ReplyAs
): string {
  const base = `/respond/${targetType}/${code}`;
  if (!replyAs) return base;
  const params = buildReplyAsParams(replyAs);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// Build the epochlag:// deep link for handing off to the native app.
// Param names mirror the web URL spec (name, phone, cc, email).
// Coordination point with mobile: confirm exact scheme + path shape.
export function deepLinkUrl(
  targetType: ReplyTargetType,
  code: string,
  replyAs?: ReplyAs
): string {
  const base = `epochlag://reply/${targetType}/${code}`;
  if (!replyAs) return base;
  const params = buildReplyAsParams(replyAs);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// Parse replyAs from URL query params on the landing page.
// Returns undefined if none of the expected params are present (Flow 1).
export function parseReplyAs(
  searchParams: Record<string, string | string[] | undefined>
): ReplyAs | undefined {
  const name = str(searchParams.name);
  // name is required in ReplyAs — without it the backend won't match an invite
  if (!name) return undefined;

  return {
    name,
    phone: str(searchParams.phone),
    countryCode: str(searchParams.cc),
    email: str(searchParams.email),
  };
}

function buildReplyAsParams(replyAs: ReplyAs): URLSearchParams {
  const p = new URLSearchParams();
  if (replyAs.name) p.set('name', replyAs.name);
  if (replyAs.phone) p.set('phone', replyAs.phone);
  // countryCode '+1' → 'cc=%2B1' (URLSearchParams encodes + as %2B automatically)
  if (replyAs.countryCode) p.set('cc', replyAs.countryCode);
  if (replyAs.email) p.set('email', replyAs.email);
  return p;
}

function str(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

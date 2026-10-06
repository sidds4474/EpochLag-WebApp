# Family Invite Web Landing — Spec for Web Team

Purpose: implement the tiny web landing page that closes the loop on EpochLag's family-tree invite flow. This is the page family members open when they receive an invite link from an EpochLag user.

## The one-line version

We generate links like `https://<web-domain>/family-invite?token=Xy7Kq2mBpQ4z` in-app. When a family member opens that link, your job is to (a) try to open the mobile app, (b) if the app isn't installed, hand the token to signup so their queued family stories land in their feed instantly.

## Where this fits in the product

An EpochLag user (the **inviter**) builds a private family tree in the app. Each entry is either a real EpochLag account or a **ghost** — a placeholder for a person not on the app yet. The inviter can share stories with ghosts; those stories queue up on the backend until the ghost claims their spot.

When the inviter taps "Invite" on a ghost, the mobile app calls `POST /api/family-tree/people/:id/invite`. BE returns an `inviteToken`. The app builds `https://<your-domain>/family-invite?token=<inviteToken>` and hands it to the OS Share sheet — WhatsApp, iMessage, email, whatever.

The recipient opens that link. **Your page is what handles the click.**

Two possible recipients:

1. **They already have the app installed** → your page should open the app via universal link / App Link. The app captures the token from the URL and stores it locally (in SecureStore). On next signup or sign-in, the app forwards it to BE.

2. **They don't have the app** → they land on your page. Your page needs to:
   - Show a friendly landing with a "Sign up" CTA (and optional "I already have an account" fallback)
   - Preserve the token through the entire signup flow (localStorage / sessionStorage / URL param)
   - Send the token as `familyInviteToken` in the signup request

## What "opens the app" means (universal links)

On iOS and Android, the same URL your page lives at can be configured to open the mobile app directly *without* your page ever rendering — as long as the app is installed and the URL matches the app's declared universal-link paths.

**On our side (mobile team, will do)**:
- Register `<your-web-domain>/family-invite` as a universal link path in the iOS `apple-app-site-association` file and Android `assetlinks.json`
- The app's URL handler already captures `?token=` and stores it (see the "Cold-launch capture" section below)

**On your side**:
- Host the `apple-app-site-association` and `.well-known/assetlinks.json` at the root of `<your-domain>` (we'll send you the JSON contents)
- Serve them with correct `Content-Type: application/json` and no redirects
- Keep the path pattern stable — changing it later breaks existing invite links in the wild

## Page behavior — what to build

### URL contract

Your page lives at exactly:
```
https://<your-domain>/family-invite?token=<TOKEN>
```

- `token` is the ONLY required query param
- Token is opaque — treat as a string, up to ~64 chars, alphanumeric
- **NEVER log the token in analytics, error trackers, or server logs.** Full stop. See "Security" below.

### Page states

The page has two rendering paths depending on whether the visitor is a new or existing user.

**State A — Not yet signed up (default, most common)**

Render a friendly landing:
- Inviter's name + relationship (optional — if we can get this from BE later; for now just say "You've been added to a family on EpochLag")
- A one-line explanation: *"Sign up to see stories your family has shared with you."*
- Big primary CTA: **"Sign up"** → routes to your signup flow, preserving the token
- Secondary link: **"I already have an account"** → sign-in flow, preserves the token

Optional but nice:
- Small note *"Or open in the app"* button that attempts `epochlag://family-invite?token=...` (deep link fallback if universal link didn't fire)

**State B — Missing / malformed token**

If `?token=` is absent or empty:
- Show a plain "Invitation link is invalid or expired" message
- CTA to marketing homepage or app-store links
- Don't crash, don't try to submit an empty token later

### Token persistence during signup

The user might not sign up immediately — they could click through OTP, back out, come back later. The token needs to survive that.

Recommended:
- On page load with valid token: `sessionStorage.setItem("familyInviteToken", token)`
- If your signup is multi-step: read it back on each step, keep it alive until the final submit
- Clear it on:
  - Successful signup response
  - User explicitly navigates away to a non-signup page (or after some TTL, e.g. 24h)

**Do NOT use** `localStorage` unless you also clear it aggressively on completion — it survives too long and could bleed across accounts on shared browsers.

### Signup request

Your signup endpoint is `POST /api/auth/register` (same endpoint the mobile app uses). Add `familyInviteToken` to the payload:

```json
{
  "firstName": "Rahul",
  "lastName": "K",
  "email": "rahul@example.com",
  "password": "...",
  "phoneVerifyToken": "...",
  "familyInviteToken": "Xy7Kq2mBpQ4z"
}
```

- `familyInviteToken` is **optional** — send it only when you have one from the URL
- BE ignores unknown or already-consumed tokens silently — you don't need to pre-validate
- On success, the user lands with the queued family stories already in their feed. No accept step. Clicking the invite link IS their consent.

### Sign-in path (they already have an account)

If the invitee already has an EpochLag account, they'd click "I already have an account" → your normal sign-in flow. **Question:** does BE support consuming `familyInviteToken` on `POST /api/auth/login` (or equivalent)?

Per the doc:

> **Remaining edge case**: An existing user whose contact info we couldn't match (e.g. a legacy account with no canonical phone) gets the link path. If they then sign in by phone instead of registering, the token isn't consumed — that path skips the signup tail. Rare, and it fails safe (no wrong delivery); they can be re-invited once their profile carries a matchable phone or email.

So the answer is: **sign-in does NOT consume the token**. If a signed-in user hits the link, best UX is to still show the landing and mention "You've been invited" but not attempt to attach the token to any request. They'll get re-invited automatically once their profile info matches.

## Security

**The token is a secret.** Anyone holding a valid token can claim that specific ghost and receive the stories queued for them. Treat it like a password reset link:

- **Never log** — no `console.log`, no Sentry breadcrumb, no analytics event, no error message that includes the token
- **Never bounce it to third parties** — no query strings on redirects to third-party analytics, no referrer leaks (`rel="noreferrer"` on any outbound links)
- **HTTPS only** — plain HTTP requests must not include the token
- **URL only** — never include the token in a JSON response body, DOM data attribute, or anywhere else it might get scraped by a browser extension or shoulder-surfer

A short TTL on `sessionStorage` (browser tab lifetime) is much safer than `localStorage` (survives browser restarts).

## Testing

Once the page is live, we'd like to run these end-to-end:

1. **Cold app-installed**: fresh iPhone with app installed → tap invite link → app opens → sign up in app → stories appear in feed
2. **No app**: link opens web page → sign up → stories appear when they open the app after install
3. **Malformed link**: no token → friendly error page, not a crash
4. **Consumed token**: same link opened twice → second one silently no-ops (BE handles this; page should not surface a scary error)
5. **Existing user, link path**: user already has account → landing shows CTA, sign-in flow does NOT attempt to consume token, page doesn't crash

## Handoff checklist

Web team:
- [ ] Reserve the URL path (`/family-invite`) and confirm it back to mobile team
- [ ] Host `apple-app-site-association` and `.well-known/assetlinks.json` (files provided by mobile team)
- [ ] Build the landing page (State A + State B above)
- [ ] Wire token into `POST /api/auth/register`
- [ ] Persist token across signup steps via `sessionStorage`
- [ ] Clear token on successful signup response
- [ ] Confirm zero token leakage to analytics / logs / third parties

Mobile team (already done in latest builds):
- [x] Client-side URL construction of invite links
- [x] Native Share sheet delivery
- [x] Cold-launch + hot-launch URL handlers capture the token
- [x] SecureStore persistence of the captured token
- [x] `familyInviteToken` forwarded on `POST /auth/register` + `POST /auth/social/finalize`
- [x] Token cleared from device on successful signup response

Backend team (already done, per FRONTEND_FAMILY_TREE.md + Addendum 1):
- [x] `POST /api/family-tree/people/:id/invite` returns `inviteToken`
- [x] `POST /api/auth/register` accepts optional `familyInviteToken`
- [x] `POST /api/auth/social/finalize` accepts optional `familyInviteToken`
- [x] Token consumption is idempotent / safe on unknown / already-claimed tokens

## Open questions to close before shipping

1. **Final URL domain** — needs to be picked and communicated to backend so their invite email template (if any) can be written. Current mobile placeholder: `https://epochlag.com/family-invite`.
2. **Sign-in edge case** — confirm the doc's fail-safe behavior is acceptable UX (users who already have accounts and hit the link can't consume the token from web; they must be re-invited or open the link on a device that resolves to the app).
3. **Analytics** — do we want a "family invite landing viewed" event? If yes, it must NOT include the token. Just a bare event count.
4. **Localization** — is the landing copy in English only for now, or does it need to match the app's language(s)?

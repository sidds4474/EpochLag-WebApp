# feature: referral
routes:
  - /invite?variant=reward|challenge&cardId=…&message=…
  - /invite/complete?variant=reward|challenge
be endpoints:
  - POST /api/referral/code
  - GET  /api/docking-station/cards/:cardId   # challenge enrichment
  - POST /api/docking-station/cards/:cardId   # challenge progress write
env: tunnel

## global prereqs
- signed_in
- viewport: [mobile, tablet, desktop]

## setup notes
- Module-scoped referral code cache — warm-seeded by home prefetch.
- Challenge variant tracks 3-tap goal via `creditLinkShareChannel` in
  challengeCache.ts. At goal → POST progress.
- ShareDrawer at /invite has `role="dialog"` + `aria-label="Invite"`.
- Public URL format: `https://epochlag.com/r/{code}`.

---

## scenario: invite-reward-loads
prereqs: signed_in
steps:
  - goto: /invite?variant=reward
  - wait: role=heading name="Challenge" (h1) visible timeout=5000
  - visible: text*="Give a month, get a month"
  - visible: text*="Invite a friend to Epoch Lag"
assert:
  - visible: role=button name="Back"
  - visible: label "Invite via link"
  - visible: text*="epochlag.com/" OR "…" placeholder
  - visible: role=button name="Copy"
  - # social chips
  - visible: role=button name="Whatsapp"
  - visible: role=button name="Facebook"
  - visible: role=button name="Message"

## scenario: invite-code-warm-cache
description: after /home prefetch, /invite renders link on first paint
prereqs: signed_in
steps:
  - goto: /home
  - wait: 1500  # prefetch settle
  - goto: /invite?variant=reward
assert:
  - within 200ms: visible: text*="epochlag.com/"
  - hidden: text="Loading your invite link"

## scenario: invite-copy
prereqs: on /invite with code loaded
steps:
  - click: role=button name="Copy"
  - # button flips to "Copied" (aria-live polite pill "link copied")
  - wait: 500
  - visible: role=button name="Copied" OR text="link copied"
assert:
  - clipboard contains: buildReferralInviteMessage output
  - clipboard text matches /epochlag\.com\/r\/\w+/
  - clipboard text contains "Play Store" AND "App Store"

## scenario: invite-copy-clipboard-unavailable
prereqs: on /invite, clipboard.writeText mocked to throw
steps:
  - click: role=button name="Copy"
assert:
  - toast visible: /Clipboard isn't available|Couldn't copy/

## scenario: invite-social-chip-opens-drawer
prereqs: on /invite with code loaded
steps:
  - click: role=button name="Whatsapp"
  - wait: role=dialog name="Invite" visible timeout=2000
  - visible: role=heading name="Invite"
  - visible: role=button name="Close"
  - visible: text*="{sharerName} invited you to join Epoch Lag"
  - visible: label="Note"
  - visible: css=#invite-note (textarea, maxlength=150, rows=3)
  - # channel chips
  - visible: role=button name="Whatsapp"
  - visible: role=button name="Messenger"
  - visible: role=button name="Facebook"
  - visible: role=button name="Message"

## scenario: invite-drawer-note-input
prereqs: ShareDrawer open
steps:
  - type: css=#invite-note = "Come join me on Epoch Lag!"
assert:
  - textarea updates

## scenario: invite-drawer-channel-external
prereqs: ShareDrawer open
steps:
  - click: role=button name="Whatsapp" (in drawer)
assert:
  - new tab opens: url matches /^https:\/\/wa\.me\/\?text=/
  - text contains referral URL + custom note if entered

## scenario: invite-drawer-close
prereqs: drawer open
steps:
  - click: role=button name="Close"
  - drawer closes
  - reopen
  - press: Escape
  - drawer closes
  - reopen
  - click: outside drawer (backdrop)
  - drawer closes

## scenario: invite-chip-tap-navigates-to-complete
prereqs: on /invite (reward), drawer channel tapped
steps:
  - click: role=button name="Whatsapp" (in drawer)
  - # onChipTap callback fires router.push
assert:
  - url_matches: /^\/invite\/complete\?variant=reward/

---

## scenario: invite-challenge-enrichment
prereqs: signed_in
steps:
  - goto: /invite?variant=challenge&cardId={env.TEST_DOCKING_CARD_ID}
  - wait: heading visible timeout=5000
assert:
  - network 200: GET /api/docking-station/cards/:cardId
  - # header text: "Epoch Lag is better together!" OR enriched title
  - visible: text*="Epoch Lag is better together" OR enriched title text

## scenario: invite-challenge-3-taps-fires-progress
description: after 3 unique channel taps → progress write with status=completed
prereqs: on /invite?variant=challenge&cardId=…
steps:
  - click: role=button name="Whatsapp"
  - # returns to /invite/complete; navigate back to /invite
  - goto: /invite?variant=challenge&cardId=…
  - click: role=button name="Facebook"
  - goto: /invite?variant=challenge&cardId=…
  - click: role=button name="Message"
assert:
  - on 3rd tap: network 200: POST /api/docking-station/cards/:cardId with { status: "completed" }

---

## scenario: invite-complete-page
prereqs: on /invite/complete?variant=reward
steps:
  - visible: role=heading name="Challenge" (h1)
  - visible: text="Challenge completed!"
  - visible: text*="You'll get a free month every time"
assert:
  - visible: role=button name="Done"
  - visible: role=button name="Back"

## scenario: invite-complete-done
prereqs: on /invite/complete
steps:
  - click: role=button name="Done"
assert:
  - navigates (likely /home)

## scenario: invite-back
prereqs: on /invite
steps:
  - click: role=button name="Back"
assert:
  - router.back() runs (likely /home)

---

## scenario: invite-suspense-fallback
description: cold nav shows skeleton, not blank
prereqs: cleared caches, fresh session
steps:
  - goto: /invite?variant=reward
assert:
  - within 300ms: skeleton visible (back button + heading placeholder + link row + social chip row)
  - eventually: real content

---

## known limits (do not file bugs)
- Clipboard writes fail on insecure origins (HTTP LAN); execCommand
  fallback may toast incorrectly.
- Messenger `fb-messenger://` deeplink silent no-op on desktop.
- Referral URL format: `https://epochlag.com/r/{code}`. That route is
  handled by BE, not the web app.
- Challenge cache is per-user localStorage — sign-out hard-reload
  wipes it (expected).
- Native `navigator.share` on ReferralPitch (onboarding) is a
  different route — see onboarding.md.

## last updated
2026-09-09 — full rewrite from verified inventory (agent-5).
